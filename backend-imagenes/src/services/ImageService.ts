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
  const relative = path.join('uploads', userId.toString(), 'images', filename);
  return relative.replace(/\\/g, '/');
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
      res.status(400).json({ error: "No se subió ningún archivo" });
      return;
    }

    const userId = req.user!.userId;
    const file = req.file;

    console.log("🔍 DEBUG - File object completo:", file);

    validateFile(file);

    const relativePath = getRelativePath(userId, file.filename);
    const { title, description } = req.body;

    // ✅ USAR file.size que ahora SÍ tiene valor (488934 en tu ejemplo)
    const fileSize = file.size;

    console.log("💾 Insertando en BD con fileSize:", fileSize);

    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO images 
      (userId, title, description, originalFilename, filename, imagePath, 
       fileSize, mimeType, uploadDate) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        userId,
        title || file.originalname || 'Untitled',
        description || null,
        file.originalname || 'unknown',
        file.filename || 'unknown',
        relativePath,
        fileSize,  // ← Esto ahora debería ser 488934
        file.mimetype || 'application/octet-stream',
      ]
    );

    console.log("✅ INSERT exitoso, ID:", result.insertId);

    // ✅ VERIFICAR qué se insertó en la BD
    const [insertedRow] = await pool.query<RowDataPacket[]>(
      `SELECT imageId, originalFilename, fileSize, mimeType FROM images WHERE imageId = ?`,
      [result.insertId]
    );

    console.log("📋 REGISTRO INSERTADO EN BD:", insertedRow[0]);

    res.status(201).json({
      success: true,
      message: "Archivo subido con éxito",
      data: {
        id: result.insertId,
        title: title || file.originalname,
        originalname: file.originalname,
        filename: file.filename,
        mimetype: file.mimetype,
        size: fileSize,
        url: `/${relativePath}`,
        type: file.mimetype.startsWith('video/') ? 'video' : 'image'
      },
    });
  } catch (error) {
    console.error("❌ Error uploading file:", error);
    res.status(500).json({
      success: false,
      error: "Error al subir el archivo",
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
// 🗑️ SOFT DELETE (TRASH)
// ============================================================================

/**
 * Move image to trash (soft delete)
 * DELETE /api/images/:id
 */
export const softDeleteImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const imageId = parseInt(req.params.id);

    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE images 
       SET deletedAt = CURRENT_TIMESTAMP
       WHERE imageId = ? AND userId = ? AND deletedAt IS NULL`,
      [imageId, userId]
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
      message: "Image moved to trash",
    });
  } catch (error) {
    console.error("Error soft deleting image:", error);
    res.status(500).json({
      success: false,
      error: "Error deleting image",
    });
  }
};

/**
 * Restore image from trash
 * POST /api/images/:id/restore
 */
export const restoreImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const imageId = parseInt(req.params.id);

    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE images 
       SET deletedAt = NULL, updatedAt = CURRENT_TIMESTAMP
       WHERE imageId = ? AND userId = ? AND deletedAt IS NOT NULL`,
      [imageId, userId]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({
        success: false,
        error: "Image not found in trash",
      });
      return;
    }

    res.json({
      success: true,
      message: "Image restored successfully",
    });
  } catch (error) {
    console.error("Error restoring image:", error);
    res.status(500).json({
      success: false,
      error: "Error restoring image",
    });
  }
};

/**
 * Get deleted images (trash)
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
        imageId, title, imagePath, mimeType,
        fileSize, deletedAt,
        createdAt
       FROM images 
       WHERE userId = ? AND deletedAt IS NOT NULL
       ORDER BY deletedAt DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    const [countResult] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM images WHERE userId = ? AND deletedAt IS NOT NULL`,
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
      error: "Error getting deleted images",
    });
  }
};

/**
 * Delete image permanently
 * DELETE /api/images/:id/permanent
 */
export const deleteImagePermanently = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const imageId = parseInt(req.params.id);

    // Get image info
    const [images] = await pool.query<RowDataPacket[]>(
      `SELECT imagePath 
       FROM images 
       WHERE imageId = ? AND userId = ?`,
      [imageId, userId]
    );

    if (images.length === 0) {
      res.status(404).json({
        success: false,
        error: "Image not found",
      });
      return;
    }

    const imagePath = images[0].imagePath;
    const absoluteImagePath = path.isAbsolute(imagePath)
      ? imagePath
      : path.join(process.cwd(), imagePath);

    // Delete from DB
    await pool.query(`DELETE FROM images WHERE imageId = ? AND userId = ?`, [imageId, userId]);

    // Delete physical file
    try {
      await fs.unlink(absoluteImagePath);
    } catch (fsError) {
      console.error("Error deleting file:", fsError);
      // Don't fail if file doesn't exist
    }

    res.json({
      success: true,
      message: "Image permanently deleted",
    });
  } catch (error) {
    console.error("Error permanently deleting image:", error);
    res.status(500).json({
      success: false,
      error: "Error permanently deleting image",
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