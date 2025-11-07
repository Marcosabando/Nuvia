// src/services/ImageService.ts
import { Request, Response } from "express";
import { pool } from "@src/config/database";
import { RowDataPacket, ResultSetHeader } from "mysql2";
import path from "path";
import fs from "fs/promises"; 


// ============================================================================
// CONSTANTS
// ============================================================================
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
const validateFile = (file: Express.Multer.File) => {
  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    throw new Error(`Format not allowed: ${file.mimetype}`);
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB`);
  }
};

const getRelativePath = (userId: number, filename: string): string => {
  return path.join("uploads", userId.toString(), filename).replace(/\\/g, '/');
};

// ============================================================================
// 📤 UPLOAD IMAGES
// ============================================================================

/**
 * Upload single image
 * POST /api/images/upload
 */
export const uploadImage = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No image uploaded" });
      return;
    }

    const userId = req.user!.userId;
    const file = req.file;

    validateFile(file);

    const relativePath = getRelativePath(userId, file.filename);
    const { title, description } = req.body;

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO images 
      (userId, title, description, originalFilename, filename, imagePath, 
       fileSize, mimeType) 
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
      message: "Image uploaded successfully",
      data: {
        imageId: result.insertId,
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
      error: "Error uploading image",
      details: (error as Error).message,
    });
  }
};

/**
 * Upload multiple images
 * POST /api/images/upload-multiple
 */
export const uploadMultipleImages = async (req: Request, res: Response): Promise<void> => {
  const connection = await pool.getConnection();
  try {
    if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
      res.status(400).json({ error: "No images uploaded" });
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
        `INSERT INTO images 
         (userId, title, originalFilename, filename, imagePath, 
          fileSize, mimeType)
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
        imageId: result.insertId,
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
      message: `${insertedImages.length} images uploaded successfully`,
      data: insertedImages,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error uploading multiple images:", error);
    res.status(500).json({
      success: false,
      error: "Error uploading images",
      details: (error as Error).message,
    });
  } finally {
    connection.release();
  }
};

// ============================================================================
// 📋 GET IMAGES
// ============================================================================

/**
 * Get all user images (active)
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
        imageId, userId, title, description,
        originalFilename, filename, 
        imagePath, fileSize, 
        mimeType, width, height,
        isFavorite, isPublic,
        location, takenDate, cameraInfo,
        createdAt, updatedAt
      FROM images 
      WHERE userId = ? AND deletedAt IS NULL
    `;

    const params: any[] = [userId];

    if (favoritesOnly) {
      query += ` AND isFavorite = 1`;
    }

    query += ` ORDER BY createdAt DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [images] = await pool.query<RowDataPacket[]>(query, params);

    // Count total
    let countQuery = `SELECT COUNT(*) as total FROM images WHERE userId = ? AND deletedAt IS NULL`;
    const countParams: any[] = [userId];

    if (favoritesOnly) {
      countQuery += ` AND isFavorite = 1`;
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
      error: "Error getting images",
    });
  }
};

/**
 * Get image by ID
 * GET /api/images/:id
 */
export const getImageById = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const imageId = parseInt(req.params.id);

    const [images] = await pool.query<RowDataPacket[]>(
      `SELECT 
        imageId, userId, title, description,
        originalFilename, filename, 
        imagePath, fileSize, 
        mimeType, width, height,
        isFavorite, isPublic,
        location, takenDate, cameraInfo,
        createdAt, updatedAt
       FROM images 
       WHERE imageId = ? AND userId = ? AND deletedAt IS NULL`,
      [imageId, userId]
    );

    if (images.length === 0) {
      res.status(404).json({
        success: false,
        error: "Image not found",
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
      error: "Error getting image",
    });
  }
};

/**
 * Get recent images (last 10)
 * GET /api/images/recent
 */
export const getRecentImages = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const limit = parseInt(req.query.limit as string) || 10;

    const [images] = await pool.query<RowDataPacket[]>(
      `SELECT 
        imageId, title, imagePath, mimeType,
        fileSize, isFavorite,
        createdAt
       FROM images 
       WHERE userId = ? AND deletedAt IS NULL
       ORDER BY createdAt DESC
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
      error: "Error getting recent images",
    });
  }
};

/**
 * Search images
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
        error: "Search term required",
      });
      return;
    }

    const searchTerm = `%${searchQuery}%`;

    const [images] = await pool.query<RowDataPacket[]>(
      `SELECT 
        imageId, title, description, imagePath,
        mimeType, fileSize,
        isFavorite, createdAt
       FROM images 
       WHERE userId = ? AND deletedAt IS NULL
         AND (title LIKE ? OR description LIKE ? OR originalFilename LIKE ?)
       ORDER BY createdAt DESC
       LIMIT ? OFFSET ?`,
      [userId, searchTerm, searchTerm, searchTerm, limit, offset]
    );

    const [countResult] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total 
       FROM images 
       WHERE userId = ? AND deletedAt IS NULL
         AND (title LIKE ? OR description LIKE ? OR originalFilename LIKE ?)`,
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
      error: "Error searching images",
    });
  }
};

// ============================================================================
// ✏️ UPDATE IMAGES
// ============================================================================

/**
 * Update image title
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
        error: "Title cannot be empty",
      });
      return;
    }

    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE images 
       SET title = ?, updatedAt = CURRENT_TIMESTAMP
       WHERE imageId = ? AND userId = ? AND deletedAt IS NULL`,
      [title.trim(), imageId, userId]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({
        success: false,
        error: "Image not found",
      });
      return;
    }

    res.json({
      success: true,
      message: "Title updated successfully",
      data: { title: title.trim() },
    });
  } catch (error) {
    console.error("Error updating image title:", error);
    res.status(500).json({
      success: false,
      error: "Error updating title",
    });
  }
};

/**
 * Update image description
 * PATCH /api/images/:id/description
 */
export const updateImageDescription = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const imageId = parseInt(req.params.id);
    const { description } = req.body;

    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE images 
       SET description = ?, updatedAt = CURRENT_TIMESTAMP
       WHERE imageId = ? AND userId = ? AND deletedAt IS NULL`,
      [description || null, imageId, userId]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({
        success: false,
        error: "Image not found",
      });
      return;
    }

    res.json({
      success: true,
      message: "Description updated successfully",
      data: { description },
    });
  } catch (error) {
    console.error("Error updating image description:", error);
    res.status(500).json({
      success: false,
      error: "Error updating description",
    });
  }
};

/**
 * Update image metadata (width, height, location, etc.)
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
      updates.push("takenDate = ?");
      values.push(takenDate);
    }
    if (cameraInfo !== undefined) {
      updates.push("cameraInfo = ?");
      values.push(cameraInfo);
    }

    if (updates.length === 0) {
      res.status(400).json({
        success: false,
        error: "No fields to update",
      });
      return;
    }

    updates.push("updatedAt = CURRENT_TIMESTAMP");
    values.push(imageId, userId);

    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE images 
       SET ${updates.join(", ")}
       WHERE imageId = ? AND userId = ? AND deletedAt IS NULL`,
      values
    );

    if (result.affectedRows === 0) {
      res.status(404).json({
        success: false,
        error: "Image not found",
      });
      return;
    }

    res.json({
      success: true,
      message: "Metadata updated successfully",
    });
  } catch (error) {
    console.error("Error updating image metadata:", error);
    res.status(500).json({
      success: false,
      error: "Error updating metadata",
    });
  }
};

// ============================================================================
// ⭐ FAVORITES
// ============================================================================

/**
 * Toggle favorite
 * POST /api/images/:id/favorite
 */
export const toggleImageFavorite = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const imageId = parseInt(req.params.id);

    // Get current state
    const [images] = await pool.query<RowDataPacket[]>(
      `SELECT isFavorite 
       FROM images 
       WHERE imageId = ? AND userId = ? AND deletedAt IS NULL`,
      [imageId, userId]
    );

    if (images.length === 0) {
      res.status(404).json({
        success: false,
        error: "Image not found",
      });
      return;
    }

    const newFavoriteStatus = !images[0].isFavorite;

    await pool.query(
      `UPDATE images 
       SET isFavorite = ?, updatedAt = CURRENT_TIMESTAMP
       WHERE imageId = ? AND userId = ?`,
      [newFavoriteStatus, imageId, userId]
    );

    res.json({
      success: true,
      message: newFavoriteStatus ? "Added to favorites" : "Removed from favorites",
      data: {
        isFavorite: newFavoriteStatus,
      },
    });
  } catch (error) {
    console.error("Error toggling favorite:", error);
    res.status(500).json({
      success: false,
      error: "Error toggling favorite status",
    });
  }
};

// ============================================================================
// 🔓 PUBLIC/PRIVATE
// ============================================================================

/**
 * Toggle public/private
 * POST /api/images/:id/toggle-public
 */
export const toggleImagePublic = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const imageId = parseInt(req.params.id);

    const [images] = await pool.query<RowDataPacket[]>(
      `SELECT isPublic 
       FROM images 
       WHERE imageId = ? AND userId = ? AND deletedAt IS NULL`,
      [imageId, userId]
    );

    if (images.length === 0) {
      res.status(404).json({
        success: false,
        error: "Image not found",
      });
      return;
    }

    const newPublicStatus = !images[0].isPublic;

    await pool.query(
      `UPDATE images 
       SET isPublic = ?, updatedAt = CURRENT_TIMESTAMP
       WHERE imageId = ? AND userId = ?`,
      [newPublicStatus, imageId, userId]
    );

    res.json({
      success: true,
      message: newPublicStatus ? "Image is now public" : "Image is now private",
      data: {
        isPublic: newPublicStatus,
      },
    });
  } catch (error) {
    console.error("Error toggling public status:", error);
    res.status(500).json({
      success: false,
      error: "Error changing visibility",
    });
  }
};



// ============================================================================
// 📊 STATISTICS
// ============================================================================

/**
 * Get user image statistics
 * GET /api/images/stats
 */
export const getImageStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const [stats] = await pool.query<RowDataPacket[]>(
      `SELECT 
        COUNT(*) as totalImages,
        SUM(fileSize) as totalSize,
        SUM(isFavorite) as totalFavorites,
        SUM(isPublic) as totalPublic,
        COUNT(CASE WHEN deletedAt IS NOT NULL THEN 1 END) as totalDeleted
       FROM images 
       WHERE userId = ?`,
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
      error: "Error getting statistics",
    });
  }
};


// ============================================================================
// ❌ DELETE IMAGES
// ============================================================================ 

/**
 * Soft delete image (move to trash)
 * DELETE /api/images/:id/trash
 **/

export const moveToTrash = async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    // 1️⃣ Buscar la imagen
    const [rows]: any = await pool.query("SELECT * FROM images WHERE imageId = ?", [id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: "Imagen no encontrada" });
    }

    const image = rows[0];

    // 2️⃣ Insertar en la papelera
    // SOLUCIÓN: No pasar deletedAt ni permanentDeleteAt, dejar que MySQL y el trigger los manejen
    await pool.query(
      `INSERT INTO trash (
        userId,
        itemType,
        itemId,
        originalName,
        originalPath,
        fileSize,
        mimeType,
        metadata
      ) VALUES (?, 'image', ?, ?, ?, ?, ?, ?)`,
      [
        image.userId,
        image.imageId,
        image.originalFilename,
        image.imagePath,
        image.fileSize,
        image.mimeType,
        JSON.stringify({
          width: image.width,
          height: image.height,
          title: image.title,
        })
      ]
    );

    // 3️⃣ Marcar imagen como eliminada (soft delete)
    await pool.query("UPDATE images SET deletedAt = NOW() WHERE imageId = ?", [id]);

    res.json({
      success: true,
      message: "🗑️ Imagen movida a la papelera correctamente",
      imageId: id,
    });
  } catch (error) {
    console.error("❌ Error al mover imagen a la papelera:", error);
    res.status(500).json({ 
      success: false, 
      message: "Error interno del servidor", 
      error: error instanceof Error ? error.message : String(error)
    });
  }
};