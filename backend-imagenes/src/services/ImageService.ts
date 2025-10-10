// src/services/ImageService.ts
import { Request, Response } from "express";
import { pool } from "@src/config/database";
import { RowDataPacket, ResultSetHeader } from "mysql2";
import path from "path";
import fs from "fs/promises";
import Image, { IImage } from "@src/models/Image";

// Constantes
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// ✅ Función auxiliar para validar archivo
const validateFile = (file: Express.Multer.File) => {
  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    throw new Error(`Formato no permitido: ${file.mimetype}`);
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`Archivo muy grande: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
  }
};

// ✅ Función auxiliar para crear ruta relativa
const getRelativePath = (userId: number, filename: string): string => {
  return path.join("uploads", userId.toString(), filename).replace(/\\/g, '/');
};

// ✅ Subir imagen individual
export const uploadImage = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No se subió ninguna imagen" });
      return;
    }

    const userId = req.user!.userId;
    const file = req.file;

    // Validar archivo
    validateFile(file);

    const relativePath = getRelativePath(userId, file.filename);

    // Insertar en BD
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO imagenes 
      (user_id, title, original_filename, filename, image_path, file_size, mime_type) 
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, file.originalname, file.originalname, file.filename, relativePath, file.size, file.mimetype]
    );

    res.status(201).json({
      success: true,
      message: "Imagen subida con éxito",
      data: {
        id: result.insertId,
        originalname: file.originalname,
        filename: file.filename,
        mimetype: file.mimetype,
        size: file.size,
        url: `/${relativePath}`,
      },
    });
  } catch (error) {
    console.error("Error uploading image:", error);
    res.status(500).json({ 
      success: false,
      error: "Error al subir la imagen",
      details: (error as Error).message 
    });
  }
};

// ✅ Subir múltiples imágenes
export const uploadMultipleImages = async (req: Request, res: Response): Promise<void> => {
  const connection = await pool.getConnection();
  try {
    if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
      res.status(400).json({ error: "No se subieron imágenes" });
      return;
    }

    const userId = req.user!.userId;
    const files = req.files as Express.Multer.File[];
    const insertedImages = [];

    await connection.beginTransaction();

    for (const file of files) {
      validateFile(file);

      const relativePath = getRelativePath(userId, file.filename);

      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO imagenes 
         (user_id, title, original_filename, filename, image_path, file_size, mime_type)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, file.originalname, file.originalname, file.filename, relativePath, file.size, file.mimetype]
      );

      insertedImages.push({
        id: result.insertId,
        originalname: file.originalname,
        filename: file.filename,
        mimetype: file.mimetype,
        size: file.size,
        url: `/${relativePath}`,
      });
    }

    await connection.commit();

    res.status(201).json({
      success: true,
      message: "Imágenes subidas con éxito",
      data: insertedImages,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error uploading multiple images:", error);
    res.status(500).json({ 
      success: false,
      error: "Error al subir las imágenes", 
      details: (error as Error).message 
    });
  } finally {
    connection.release();
  }
};

// ✅ Obtener todas las imágenes del usuario
export const getUserImages = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const [images] = await pool.query<RowDataPacket[]>(
      `SELECT id, user_id as userId, title, original_filename as originalFilename, 
              filename, image_path as imagePath, file_size as fileSize, 
              mime_type as mimeType, created_at as created
       FROM imagenes 
       WHERE user_id = ?
       ORDER BY created DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    const [countResult] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM imagenes WHERE user_id = ?`,
      [userId]
    );

    const total = countResult[0].total;

    res.json({
      success: true,
      data: images,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error getting user images:", error);
    res.status(500).json({ 
      success: false,
      error: "Error al obtener las imágenes" 
    });
  }
};

// ✅ Obtener imagen por ID
export const getImageById = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const imageId = parseInt(req.params.id);

    const [images] = await pool.query<RowDataPacket[]>(
      `SELECT id, user_id as userId, title, original_filename as originalFilename, 
              filename, image_path as imagePath, file_size as fileSize, 
              mime_type as mimeType, created_at as created 
       FROM imagenes 
       WHERE id = ? AND user_id = ?`,
      [imageId, userId]
    );

    if (images.length === 0) {
      res.status(404).json({ 
        success: false,
        error: "Imagen no encontrada" 
      });
      return;
    }

    res.json({
      success: true,
      data: images[0],
    });
  } catch (error) {
    console.error("Error getting image:", error);
    res.status(500).json({ 
      success: false,
      error: "Error al obtener la imagen" 
    });
  }
};

// ✅ Eliminar imagen
export const deleteImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const imageId = parseInt(req.params.id);

    // Obtener info de la imagen
    const [images] = await pool.query<RowDataPacket[]>(
      `SELECT image_path as imagePath FROM imagenes WHERE id = ? AND user_id = ?`,
      [imageId, userId]
    );

    if (images.length === 0) {
      res.status(404).json({ 
        success: false,
        error: "Imagen no encontrada" 
      });
      return;
    }

    const imagePath = images[0].imagePath;

    // Eliminar de BD
    await pool.query(
      `DELETE FROM imagenes WHERE id = ? AND user_id = ?`,
      [imageId, userId]
    );

    // Eliminar archivo físico
    try {
      await fs.unlink(imagePath);
    } catch (fsError) {
      console.error("Error deleting file:", fsError);
      // No fallar si el archivo no existe
    }

    res.json({
      success: true,
      message: "Imagen eliminada con éxito",
    });
  } catch (error) {
    console.error("Error deleting image:", error);
    res.status(500).json({ 
      success: false,
      error: "Error al eliminar la imagen" 
    });
  }
};