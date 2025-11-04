// src/services/ImageService.ts
import { Request, Response } from "express";
import { pool } from "@src/config/database";
import { RowDataPacket, ResultSetHeader } from "mysql2";
import path from "path";
import fs from "fs/promises";

// ============================================================================
// CONSTANTES
// ============================================================================
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// ============================================================================
// FUNCIONES AUXILIARES
// ============================================================================
const validateFile = (file: Express.Multer.File) => {
  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    throw new Error(`Formato no permitido: ${file.mimetype}`);
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`Archivo muy grande: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
  }
};

const getRelativePath = (userId: number, filename: string): string => {
  return path.join("uploads", userId.toString(), filename).replace(/\\/g, '/');
};

// ============================================================================
// 📤 SUBIR IMÁGENES
// ============================================================================

/**
 * Subir una imagen individual
 * POST /api/images/upload
 */
export const uploadImage = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No se subió ninguna imagen" });
      return;
    }

    const userId = req.user!.userId;
    const file = req.file;

    validateFile(file);

    const relativePath = getRelativePath(userId, file.filename);
    const { title, description } = req.body;

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO imagenes 
      (user_id, title, description, original_filename, filename, image_path, 
       file_size, mime_type) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        title || file.originalname,
        description || null,
        file.originalname,
        file.filename,
        relativePath,
        file.size,
        file.mimetype,
      ]
    );

    res.status(201).json({
      success: true,
      message: "Imagen subida con éxito",
      data: {
        id: result.insertId,
        title: title || file.originalname,
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
      details: (error as Error).message,
    });
  }
};

/**
 * Subir múltiples imágenes
 * POST /api/images/upload-multiple
 */
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
         (user_id, title, original_filename, filename, image_path, 
          file_size, mime_type)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          userId,
          file.originalname,
          file.originalname,
          file.filename,
          relativePath,
          file.size,
          file.mimetype,
        ]
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
      message: `${insertedImages.length} imágenes subidas con éxito`,
      data: insertedImages,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error uploading multiple images:", error);
    res.status(500).json({
      success: false,
      error: "Error al subir las imágenes",
      details: (error as Error).message,
    });
  } finally {
    connection.release();
  }
};

// ============================================================================
// 📋 OBTENER IMÁGENES
// ============================================================================

/**
 * Obtener todas las imágenes del usuario (activas)
 * GET /api/images
 * Query params: page, limit, favorites (true/false)
 */
export const getUserImages = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const favoritesOnly = req.query.favorites === "true";

    let query = `
      SELECT 
        id, user_id as userId, title, description,
        original_filename as originalFilename, filename, 
        image_path as imagePath, file_size as fileSize, 
        mime_type as mimeType, width, height,
        is_favorite as isFavorite, is_public as isPublic,
        location, taken_date as takenDate, camera_info as cameraInfo,
        created_at as createdAt, updated_at as updatedAt
      FROM imagenes 
      WHERE user_id = ? AND deleted_at IS NULL
    `;

    const params: any[] = [userId];

    if (favoritesOnly) {
      query += ` AND is_favorite = 1`;
    }

    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [images] = await pool.query<RowDataPacket[]>(query, params);

    // Contar total
    let countQuery = `SELECT COUNT(*) as total FROM imagenes WHERE user_id = ? AND deleted_at IS NULL`;
    const countParams: any[] = [userId];

    if (favoritesOnly) {
      countQuery += ` AND is_favorite = 1`;
    }

    const [countResult] = await pool.query<RowDataPacket[]>(countQuery, countParams);
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
      error: "Error al obtener las imágenes",
    });
  }
};

/**
 * Obtener imagen por ID
 * GET /api/images/:id
 */
export const getImageById = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const imageId = parseInt(req.params.id);

    const [images] = await pool.query<RowDataPacket[]>(
      `SELECT 
        id, user_id as userId, title, description,
        original_filename as originalFilename, filename, 
        image_path as imagePath, file_size as fileSize, 
        mime_type as mimeType, width, height,
        is_favorite as isFavorite, is_public as isPublic,
        location, taken_date as takenDate, camera_info as cameraInfo,
        created_at as createdAt, updated_at as updatedAt
       FROM imagenes 
       WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      [imageId, userId]
    );

    if (images.length === 0) {
      res.status(404).json({
        success: false,
        error: "Imagen no encontrada",
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
      error: "Error al obtener la imagen",
    });
  }
};

/**
 * Obtener imágenes recientes (últimas 10)
 * GET /api/images/recent
 */
export const getRecentImages = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const limit = parseInt(req.query.limit as string) || 10;

    const [images] = await pool.query<RowDataPacket[]>(
      `SELECT 
        id, title, image_path as imagePath, mime_type as mimeType,
        file_size as fileSize, is_favorite as isFavorite,
        created_at as createdAt
       FROM imagenes 
       WHERE user_id = ? AND deleted_at IS NULL
       ORDER BY created_at DESC
       LIMIT ?`,
      [userId, limit]
    );

    res.json({
      success: true,
      data: images,
    });
  } catch (error) {
    console.error("Error getting recent images:", error);
    res.status(500).json({
      success: false,
      error: "Error al obtener imágenes recientes",
    });
  }
};

/**
 * Buscar imágenes
 * GET /api/images/search?q=query
 */
export const searchImages = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const searchQuery = req.query.q as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    if (!searchQuery || searchQuery.trim() === "") {
      res.status(400).json({
        success: false,
        error: "Se requiere un término de búsqueda",
      });
      return;
    }

    const searchTerm = `%${searchQuery}%`;

    const [images] = await pool.query<RowDataPacket[]>(
      `SELECT 
        id, title, description, image_path as imagePath,
        mime_type as mimeType, file_size as fileSize,
        is_favorite as isFavorite, created_at as createdAt
       FROM imagenes 
       WHERE user_id = ? AND deleted_at IS NULL
         AND (title LIKE ? OR description LIKE ? OR original_filename LIKE ?)
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, searchTerm, searchTerm, searchTerm, limit, offset]
    );

    const [countResult] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total 
       FROM imagenes 
       WHERE user_id = ? AND deleted_at IS NULL
         AND (title LIKE ? OR description LIKE ? OR original_filename LIKE ?)`,
      [userId, searchTerm, searchTerm, searchTerm]
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
    console.error("Error searching images:", error);
    res.status(500).json({
      success: false,
      error: "Error al buscar imágenes",
    });
  }
};

// ============================================================================
// ✏️ ACTUALIZAR IMÁGENES
// ============================================================================

/**
 * Actualizar título de imagen
 * PATCH /api/images/:id/title
 */
export const updateImageTitle = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const imageId = parseInt(req.params.id);
    const { title } = req.body;

    if (!title || title.trim() === "") {
      res.status(400).json({
        success: false,
        error: "El título no puede estar vacío",
      });
      return;
    }

    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE imagenes 
       SET title = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      [title.trim(), imageId, userId]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({
        success: false,
        error: "Imagen no encontrada",
      });
      return;
    }

    res.json({
      success: true,
      message: "Título actualizado con éxito",
      data: { title: title.trim() },
    });
  } catch (error) {
    console.error("Error updating image title:", error);
    res.status(500).json({
      success: false,
      error: "Error al actualizar el título",
    });
  }
};

/**
 * Actualizar descripción de imagen
 * PATCH /api/images/:id/description
 */
export const updateImageDescription = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const imageId = parseInt(req.params.id);
    const { description } = req.body;

    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE imagenes 
       SET description = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      [description || null, imageId, userId]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({
        success: false,
        error: "Imagen no encontrada",
      });
      return;
    }

    res.json({
      success: true,
      message: "Descripción actualizada con éxito",
      data: { description },
    });
  } catch (error) {
    console.error("Error updating image description:", error);
    res.status(500).json({
      success: false,
      error: "Error al actualizar la descripción",
    });
  }
};

/**
 * Actualizar metadatos de imagen (width, height, location, etc.)
 * PATCH /api/images/:id/metadata
 */
export const updateImageMetadata = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const imageId = parseInt(req.params.id);
    const { width, height, location, takenDate, cameraInfo } = req.body;

    const updates: string[] = [];
    const values: any[] = [];

    if (width !== undefined) {
      updates.push("width = ?");
      values.push(width);
    }
    if (height !== undefined) {
      updates.push("height = ?");
      values.push(height);
    }
    if (location !== undefined) {
      updates.push("location = ?");
      values.push(location);
    }
    if (takenDate !== undefined) {
      updates.push("taken_date = ?");
      values.push(takenDate);
    }
    if (cameraInfo !== undefined) {
      updates.push("camera_info = ?");
      values.push(cameraInfo);
    }

    if (updates.length === 0) {
      res.status(400).json({
        success: false,
        error: "No hay campos para actualizar",
      });
      return;
    }

    updates.push("updated_at = CURRENT_TIMESTAMP");
    values.push(imageId, userId);

    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE imagenes 
       SET ${updates.join(", ")}
       WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      values
    );

    if (result.affectedRows === 0) {
      res.status(404).json({
        success: false,
        error: "Imagen no encontrada",
      });
      return;
    }

    res.json({
      success: true,
      message: "Metadatos actualizados con éxito",
    });
  } catch (error) {
    console.error("Error updating image metadata:", error);
    res.status(500).json({
      success: false,
      error: "Error al actualizar los metadatos",
    });
  }
};

// ============================================================================
// ⭐ FAVORITOS
// ============================================================================

/**
 * Toggle favorito
 * POST /api/images/:id/favorite
 */
export const toggleImageFavorite = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const imageId = parseInt(req.params.id);

    // Obtener estado actual
    const [images] = await pool.query<RowDataPacket[]>(
      `SELECT is_favorite as isFavorite 
       FROM imagenes 
       WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      [imageId, userId]
    );

    if (images.length === 0) {
      res.status(404).json({
        success: false,
        error: "Imagen no encontrada",
      });
      return;
    }

    const newFavoriteStatus = !images[0].isFavorite;

    await pool.query(
      `UPDATE imagenes 
       SET is_favorite = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [newFavoriteStatus, imageId, userId]
    );

    res.json({
      success: true,
      message: newFavoriteStatus ? "Agregado a favoritos" : "Eliminado de favoritos",
      data: {
        isFavorite: newFavoriteStatus,
      },
    });
  } catch (error) {
    console.error("Error toggling favorite:", error);
    res.status(500).json({
      success: false,
      error: "Error al cambiar el estado de favorito",
    });
  }
};

// ============================================================================
// 🔓 PÚBLICO/PRIVADO
// ============================================================================

/**
 * Toggle público/privado
 * POST /api/images/:id/toggle-public
 */
export const toggleImagePublic = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const imageId = parseInt(req.params.id);

    const [images] = await pool.query<RowDataPacket[]>(
      `SELECT is_public as isPublic 
       FROM imagenes 
       WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      [imageId, userId]
    );

    if (images.length === 0) {
      res.status(404).json({
        success: false,
        error: "Imagen no encontrada",
      });
      return;
    }

    const newPublicStatus = !images[0].isPublic;

    await pool.query(
      `UPDATE imagenes 
       SET is_public = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ?`,
      [newPublicStatus, imageId, userId]
    );

    res.json({
      success: true,
      message: newPublicStatus ? "Imagen ahora es pública" : "Imagen ahora es privada",
      data: {
        isPublic: newPublicStatus,
      },
    });
  } catch (error) {
    console.error("Error toggling public status:", error);
    res.status(500).json({
      success: false,
      error: "Error al cambiar la visibilidad",
    });
  }
};

// ============================================================================
// 🗑️ SOFT DELETE (PAPELERA)
// ============================================================================

/**
 * Mover imagen a papelera (soft delete)
 * DELETE /api/images/:id
 */
export const softDeleteImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const imageId = parseInt(req.params.id);

    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE imagenes 
       SET deleted_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      [imageId, userId]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({
        success: false,
        error: "Imagen no encontrada",
      });
      return;
    }

    res.json({
      success: true,
      message: "Imagen movida a la papelera",
    });
  } catch (error) {
    console.error("Error soft deleting image:", error);
    res.status(500).json({
      success: false,
      error: "Error al eliminar la imagen",
    });
  }
};

/**
 * Restaurar imagen desde papelera
 * POST /api/images/:id/restore
 */
export const restoreImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const imageId = parseInt(req.params.id);

    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE imagenes 
       SET deleted_at = NULL, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND user_id = ? AND deleted_at IS NOT NULL`,
      [imageId, userId]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({
        success: false,
        error: "Imagen no encontrada en la papelera",
      });
      return;
    }

    res.json({
      success: true,
      message: "Imagen restaurada con éxito",
    });
  } catch (error) {
    console.error("Error restoring image:", error);
    res.status(500).json({
      success: false,
      error: "Error al restaurar la imagen",
    });
  }
};

/**
 * Obtener imágenes eliminadas (papelera)
 * GET /api/images/deleted
 */
export const getDeletedImages = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const [images] = await pool.query<RowDataPacket[]>(
      `SELECT 
        id, title, image_path as imagePath, mime_type as mimeType,
        file_size as fileSize, deleted_at as deletedAt,
        created_at as createdAt
       FROM imagenes 
       WHERE user_id = ? AND deleted_at IS NOT NULL
       ORDER BY deleted_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    const [countResult] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM imagenes WHERE user_id = ? AND deleted_at IS NOT NULL`,
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
    console.error("Error getting deleted images:", error);
    res.status(500).json({
      success: false,
      error: "Error al obtener imágenes eliminadas",
    });
  }
};

/**
 * Eliminar imagen permanentemente
 * DELETE /api/images/:id/permanent
 */
export const deleteImagePermanently = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const imageId = parseInt(req.params.id);

    // Obtener info de la imagen
    const [images] = await pool.query<RowDataPacket[]>(
      `SELECT image_path as imagePath 
       FROM imagenes 
       WHERE id = ? AND user_id = ?`,
      [imageId, userId]
    );

    if (images.length === 0) {
      res.status(404).json({
        success: false,
        error: "Imagen no encontrada",
      });
      return;
    }

    const imagePath = images[0].imagePath;

    // Eliminar de BD
    await pool.query(`DELETE FROM imagenes WHERE id = ? AND user_id = ?`, [imageId, userId]);

    // Eliminar archivo físico
    try {
      await fs.unlink(imagePath);
    } catch (fsError) {
      console.error("Error deleting file:", fsError);
      // No fallar si el archivo no existe
    }

    res.json({
      success: true,
      message: "Imagen eliminada permanentemente",
    });
  } catch (error) {
    console.error("Error permanently deleting image:", error);
    res.status(500).json({
      success: false,
      error: "Error al eliminar la imagen permanentemente",
    });
  }
};

// ============================================================================
// 📊 ESTADÍSTICAS
// ============================================================================

/**
 * Obtener estadísticas de imágenes del usuario
 * GET /api/images/stats
 */
export const getImageStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const [stats] = await pool.query<RowDataPacket[]>(
      `SELECT 
        COUNT(*) as totalImages,
        SUM(file_size) as totalSize,
        SUM(is_favorite) as totalFavorites,
        SUM(is_public) as totalPublic,
        COUNT(CASE WHEN deleted_at IS NOT NULL THEN 1 END) as totalDeleted
       FROM imagenes 
       WHERE user_id = ?`,
      [userId]
    );

    const result = stats[0];

    res.json({
      success: true,
      data: {
        totalImages: result.totalImages || 0,
        totalSize: result.totalSize || 0,
        totalSizeFormatted: ((result.totalSize || 0) / (1024 * 1024)).toFixed(2) + " MB",
        totalFavorites: result.totalFavorites || 0,
        totalPublic: result.totalPublic || 0,
        totalDeleted: result.totalDeleted || 0,
        totalActive: (result.totalImages || 0) - (result.totalDeleted || 0),
      },
    });
  } catch (error) {
    console.error("Error getting image stats:", error);
    res.status(500).json({
      success: false,
      error: "Error al obtener estadísticas",
    });
  }
};