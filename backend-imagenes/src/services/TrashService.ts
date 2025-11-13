import { Request, Response } from "express";
import { RowDataPacket, ResultSetHeader } from "mysql2/promise";
import fs from "fs/promises";
import pool from "@src/config/database";

// ============================================================================
// 📋 GET TRASH ITEMS
// ============================================================================

/**
 * Get all trash items for user
 * GET /api/trash
 */
export const getTrashItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;
    const itemType = req.query.type as string;

    let query = `
      SELECT 
        trashId as id,
        userId,
        itemType,
        itemId,
        originalName,
        originalPath,
        fileSize,
        mimeType,
        metadata,
        deletedAt,
        permanentDeleteAt
      FROM trash 
      WHERE userId = ?
    `;

    const params: any[] = [userId];

    if (itemType && ['image', 'video', 'document', 'folder'].includes(itemType)) {
      query += ` AND itemType = ?`;
      params.push(itemType);
    }

    query += ` ORDER BY deletedAt DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [items] = await pool.query<RowDataPacket[]>(query, params);

    // Count total
    let countQuery = `SELECT COUNT(*) as total FROM trash WHERE userId = ?`;
    const countParams: any[] = [userId];

    if (itemType && ['image', 'video', 'document', 'folder'].includes(itemType)) {
      countQuery += ` AND itemType = ?`;
      countParams.push(itemType);
    }

    const [countResult] = await pool.query<RowDataPacket[]>(countQuery, countParams);
    const total = countResult[0].total;

    res.json({
      success: true,
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error getting trash items:", error);
    res.status(500).json({
      success: false,
      error: "Error getting trash items",
    });
  }
};

/**
 * Get trash statistics
 * GET /api/trash/stats
 */
export const getTrashStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const [stats] = await pool.query<RowDataPacket[]>(
      `SELECT 
        COUNT(*) as totalItems,
        SUM(fileSize) as totalSize,
        COUNT(CASE WHEN itemType = 'image' THEN 1 END) as totalImages,
        COUNT(CASE WHEN itemType = 'video' THEN 1 END) as totalVideos,
        COUNT(CASE WHEN permanentDeleteAt <= DATE_ADD(NOW(), INTERVAL 7 DAY) THEN 1 END) as expiringSoon
       FROM trash 
       WHERE userId = ?`,
      [userId]
    );

    const result = stats[0];

    res.json({
      success: true,
      data: {
        totalItems: result.totalItems || 0,
        totalSize: result.totalSize || 0,
        totalSizeFormatted: ((result.totalSize || 0) / (1024 * 1024)).toFixed(2) + " MB",
        totalImages: result.totalImages || 0,
        totalVideos: result.totalVideos || 0,
        expiringSoon: result.expiringSoon || 0,
      },
    });
  } catch (error) {
    console.error("Error getting trash stats:", error);
    res.status(500).json({
      success: false,
      error: "Error getting trash statistics",
    });
  }
};

// ============================================================================
// 🗑️ SOFT DELETE (TRASH) - IMÁGENES
// ============================================================================

/**
 * Move image to trash (soft delete)
 * DELETE /api/images/:id
 */
export const softDeleteImage = async (req: Request, res: Response): Promise<void> => {
  const connection = await pool.getConnection();
  try {
    const userId = req.user!.userId;
    const imageId = parseInt(req.params.id);

    await connection.beginTransaction();

    // Get image info
    const [images] = await connection.query<RowDataPacket[]>(
      `SELECT imageId, title, originalFilename, filename, imagePath, fileSize, mimeType, width, height
       FROM images 
       WHERE imageId = ? AND userId = ? AND deletedAt IS NULL`,
      [imageId, userId]
    );

    if (images.length === 0) {
      await connection.rollback();
      res.status(404).json({
        success: false,
        error: "Image not found",
      });
      return;
    }

    const image = images[0];

    // Mark as deleted in images table
    await connection.query(
      `UPDATE images 
       SET deletedAt = CURRENT_TIMESTAMP
       WHERE imageId = ? AND userId = ?`,
      [imageId, userId]
    );

    // ✅ CONSTRUIR RUTA COMPLETA CON /images/
    let fullPath = image.imagePath;
    
    // Si no empieza con 'uploads/', agregarlo
    if (!fullPath.startsWith('uploads/')) {
      fullPath = `uploads/${fullPath}`;
    }
    
    // ✅ Si la ruta no incluye '/images/', insertarlo después del userId
    // Ejemplo: "uploads/2/archivo.png" → "uploads/2/images/archivo.png"
    if (!fullPath.includes('/images/') && !fullPath.includes('/videos/')) {
      const parts = fullPath.split('/');
      if (parts.length >= 3) {
        // parts = ["uploads", "2", "archivo.png"]
        parts.splice(2, 0, 'images'); // Insertar 'images' después de userId
        fullPath = parts.join('/');
      }
    }

    console.log('📁 Ruta de imagen guardada en trash:', fullPath);

    // Add to trash table
    const metadata = JSON.stringify({
      width: image.width,
      height: image.height,
      title: image.title,
    });

    await connection.query(
      `INSERT INTO trash 
       (userId, itemType, itemId, originalName, originalPath, fileSize, mimeType, metadata)
       VALUES (?, 'image', ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        imageId,
        image.originalFilename || image.filename,
        fullPath,  // ✅ Usar la ruta corregida
        image.fileSize,
        image.mimeType,
        metadata,
      ]
    );

    await connection.commit();

    res.json({
      success: true,
      message: "Image moved to trash",
      data: {
        imageId,
        originalName: image.originalFilename || image.filename,
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error moving image to trash:", error);
    res.status(500).json({
      success: false,
      error: "Error moving image to trash",
      details: (error as Error).message,
    });
  } finally {
    connection.release();
  }
};

// ============================================================================
// 🗑️ SOFT DELETE (TRASH) - VIDEOS
// ============================================================================

/**
 * Move video to trash (soft delete)
 * DELETE /api/videos/:id
 */
export const softDeleteVideo = async (req: Request, res: Response): Promise<void> => {
  const connection = await pool.getConnection();
  try {
    const userId = req.user!.userId;
    const videoId = parseInt(req.params.id);

    await connection.beginTransaction();

    // Get video info
    const [videos] = await connection.query<RowDataPacket[]>(
      `SELECT videoId, title, originalFilename, filename, videoPath, fileSize, mimeType, duration, width, height
       FROM videos 
       WHERE videoId = ? AND userId = ? AND deletedAt IS NULL`,
      [videoId, userId]
    );

    if (videos.length === 0) {
      await connection.rollback();
      res.status(404).json({
        success: false,
        error: "Video not found",
      });
      return;
    }

    const video = videos[0];

    // Mark as deleted
    await connection.query(
      `UPDATE videos 
       SET deletedAt = CURRENT_TIMESTAMP
       WHERE videoId = ? AND userId = ?`,
      [videoId, userId]
    );

    // ✅ CONSTRUIR RUTA COMPLETA CON /videos/
    let fullPath = video.videoPath;
    
    if (!fullPath.startsWith('uploads/')) {
      fullPath = `uploads/${fullPath}`;
    }
    
    // ✅ Insertar '/videos/' si no existe
    if (!fullPath.includes('/videos/') && !fullPath.includes('/images/')) {
      const parts = fullPath.split('/');
      if (parts.length >= 3) {
        parts.splice(2, 0, 'videos'); // Insertar 'videos' después de userId
        fullPath = parts.join('/');
      }
    }

    console.log('📁 Ruta de video guardada en trash:', fullPath);

    const metadata = JSON.stringify({
      duration: video.duration,
      width: video.width,
      height: video.height,
      title: video.title,
    });

    await connection.query(
      `INSERT INTO trash 
       (userId, itemType, itemId, originalName, originalPath, fileSize, mimeType, metadata)
       VALUES (?, 'video', ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        videoId,
        video.originalFilename || video.filename,
        fullPath,
        video.fileSize,
        video.mimeType,
        metadata,
      ]
    );

    await connection.commit();

    res.json({
      success: true,
      message: "Video moved to trash",
      data: {
        videoId,
        originalName: video.originalFilename || video.filename,
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error moving video to trash:", error);
    res.status(500).json({
      success: false,
      error: "Error moving video to trash",
      details: (error as Error).message,
    });
  } finally {
    connection.release();
  }
};

/**
 * Restore image from trash
 * POST /api/images/:id/restore
 */
export const restoreImage = async (req: Request, res: Response): Promise<void> => {
  const connection = await pool.getConnection();
  try {
    const userId = req.user!.userId;
    const imageId = parseInt(req.params.id);

    await connection.beginTransaction();

    // Restore image
    const [result] = await connection.query<ResultSetHeader>(
      `UPDATE images 
       SET deletedAt = NULL, updatedAt = CURRENT_TIMESTAMP
       WHERE imageId = ? AND userId = ? AND deletedAt IS NOT NULL`,
      [imageId, userId]
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      res.status(404).json({
        success: false,
        error: "Image not found in trash",
      });
      return;
    }

    // Remove from trash table
    await connection.query(
      `DELETE FROM trash WHERE itemType = 'image' AND itemId = ? AND userId = ?`,
      [imageId, userId]
    );

    await connection.commit();

    res.json({
      success: true,
      message: "Image restored successfully",
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error restoring image:", error);
    res.status(500).json({
      success: false,
      error: "Error restoring image",
    });
  } finally {
    connection.release();
  }
};

/**
 * Restore video from trash
 * POST /api/videos/:id/restore
 */
export const restoreVideo = async (req: Request, res: Response): Promise<void> => {
  const connection = await pool.getConnection();
  try {
    const userId = req.user!.userId;
    const videoId = parseInt(req.params.id);

    await connection.beginTransaction();

    // Restore video
    const [result] = await connection.query<ResultSetHeader>(
      `UPDATE videos 
       SET deletedAt = NULL, updatedAt = CURRENT_TIMESTAMP
       WHERE videoId = ? AND userId = ? AND deletedAt IS NOT NULL`,
      [videoId, userId]
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      res.status(404).json({
        success: false,
        error: "Video not found in trash",
      });
      return;
    }

    // Remove from trash table
    await connection.query(
      `DELETE FROM trash WHERE itemType = 'video' AND itemId = ? AND userId = ?`,
      [videoId, userId]
    );

    await connection.commit();

    res.json({
      success: true,
      message: "Video restored successfully",
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error restoring video:", error);
    res.status(500).json({
      success: false,
      error: "Error restoring video",
    });
  } finally {
    connection.release();
  }
};

/**
 * Delete image permanently
 * DELETE /api/images/:id/permanent
 */
export const deleteImagePermanently = async (req: Request, res: Response): Promise<void> => {
  const connection = await pool.getConnection();
  try {
    const userId = req.user!.userId;
    const imageId = parseInt(req.params.id);

    await connection.beginTransaction();

    // Get image info
    const [images] = await connection.query<RowDataPacket[]>(
      `SELECT imagePath 
       FROM images 
       WHERE imageId = ? AND userId = ?`,
      [imageId, userId]
    );

    if (images.length === 0) {
      await connection.rollback();
      res.status(404).json({
        success: false,
        error: "Image not found",
      });
      return;
    }

    const imagePath = images[0].imagePath;

    // Delete from DB
    await connection.query(`DELETE FROM images WHERE imageId = ? AND userId = ?`, [imageId, userId]);

    // Remove from trash table
    await connection.query(
      `DELETE FROM trash WHERE itemType = 'image' AND itemId = ? AND userId = ?`,
      [imageId, userId]
    );

    await connection.commit();

    // Delete physical file
    try {
      await fs.unlink(imagePath);
      console.log(`✅ File deleted: ${imagePath}`);
    } catch (fsError) {
      console.error("Error deleting file:", fsError);
      // Don't fail if file doesn't exist
    }

    res.json({
      success: true,
      message: "Image permanently deleted",
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error permanently deleting image:", error);
    res.status(500).json({
      success: false,
      error: "Error permanently deleting image",
    });
  } finally {
    connection.release();
  }
};

/**
 * Delete video permanently
 * DELETE /api/videos/:id/permanent
 */
export const deleteVideoPermanently = async (req: Request, res: Response): Promise<void> => {
  const connection = await pool.getConnection();
  try {
    const userId = req.user!.userId;
    const videoId = parseInt(req.params.id);

    await connection.beginTransaction();

    // Get video info
    const [videos] = await connection.query<RowDataPacket[]>(
      `SELECT videoPath 
       FROM videos 
       WHERE videoId = ? AND userId = ?`,
      [videoId, userId]
    );

    if (videos.length === 0) {
      await connection.rollback();
      res.status(404).json({
        success: false,
        error: "Video not found",
      });
      return;
    }

    const videoPath = videos[0].videoPath;

    // Delete from DB
    await connection.query(`DELETE FROM videos WHERE videoId = ? AND userId = ?`, [videoId, userId]);

    // Remove from trash table
    await connection.query(
      `DELETE FROM trash WHERE itemType = 'video' AND itemId = ? AND userId = ?`,
      [videoId, userId]
    );

    await connection.commit();

    // Delete physical file
    try {
      await fs.unlink(videoPath);
      console.log(`✅ Video file deleted: ${videoPath}`);
    } catch (fsError) {
      console.error("Error deleting video file:", fsError);
      // Don't fail if file doesn't exist
    }

    res.json({
      success: true,
      message: "Video permanently deleted",
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error permanently deleting video:", error);
    res.status(500).json({
      success: false,
      error: "Error permanently deleting video",
    });
  } finally {
    connection.release();
  }
};

// ============================================================================
// ♻️ RESTORE ITEMS - Para papelera general
// ============================================================================

/**
 * Restore item from trash (general)
 * POST /api/trash/:id/restore
 */
export const restoreItem = async (req: Request, res: Response): Promise<void> => {
  const connection = await pool.getConnection();
  try {
    const userId = req.user!.userId;
    const trashId = parseInt(req.params.id);

    await connection.beginTransaction();

    // Get trash item
    const [trashItems] = await connection.query<RowDataPacket[]>(
      `SELECT * FROM trash WHERE trashId = ? AND userId = ?`,
      [trashId, userId]
    );

    if (trashItems.length === 0) {
      await connection.rollback();
      res.status(404).json({
        success: false,
        error: "Item not found in trash",
      });
      return;
    }

    const item = trashItems[0];

    // Restore based on type
    if (item.itemType === 'image') {
      await connection.query(
        `UPDATE images SET deletedAt = NULL WHERE imageId = ? AND userId = ?`,
        [item.itemId, userId]
      );
    } else if (item.itemType === 'video') {
      await connection.query(
        `UPDATE videos SET deletedAt = NULL WHERE videoId = ? AND userId = ?`,
        [item.itemId, userId]
      );
    }

    // Remove from trash
    await connection.query(
      `DELETE FROM trash WHERE trashId = ? AND userId = ?`,
      [trashId, userId]
    );

    await connection.commit();

    res.json({
      success: true,
      message: `${item.itemType} restored successfully`,
      data: {
        itemType: item.itemType,
        itemId: item.itemId,
        originalName: item.originalName,
      },
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error restoring item:", error);
    res.status(500).json({
      success: false,
      error: "Error restoring item",
      details: (error as Error).message,
    });
  } finally {
    connection.release();
  }
};

/**
 * Restore multiple items
 * POST /api/trash/restore-multiple
 * Body: { ids: number[] }
 */
export const restoreMultipleItems = async (req: Request, res: Response): Promise<void> => {
  const connection = await pool.getConnection();
  try {
    const userId = req.user!.userId;
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({
        success: false,
        error: "No items specified",
      });
      return;
    }

    await connection.beginTransaction();

    let restoredCount = 0;

    for (const trashId of ids) {
      const [trashItems] = await connection.query<RowDataPacket[]>(
        `SELECT * FROM trash WHERE trashId = ? AND userId = ?`,
        [trashId, userId]
      );

      if (trashItems.length === 0) continue;

      const item = trashItems[0];

      if (item.itemType === 'image') {
        await connection.query(
          `UPDATE images SET deletedAt = NULL WHERE imageId = ? AND userId = ?`,
          [item.itemId, userId]
        );
      } else if (item.itemType === 'video') {
        await connection.query(
          `UPDATE videos SET deletedAt = NULL WHERE videoId = ? AND userId = ?`,
          [item.itemId, userId]
        );
      }

      await connection.query(
        `DELETE FROM trash WHERE trashId = ? AND userId = ?`,
        [trashId, userId]
      );

      restoredCount++;
    }

    await connection.commit();

    res.json({
      success: true,
      message: `${restoredCount} items restored successfully`,
      data: { restoredCount },
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error restoring multiple items:", error);
    res.status(500).json({
      success: false,
      error: "Error restoring items",
    });
  } finally {
    connection.release();
  }
};

// ============================================================================
// 🔥 PERMANENT DELETE
// ============================================================================

/**
 * Delete item permanently (general)
 * DELETE /api/trash/:id
 */
export const deleteItemPermanently = async (req: Request, res: Response): Promise<void> => {
  const connection = await pool.getConnection();
  try {
    const userId = req.user!.userId;
    const trashId = parseInt(req.params.id);

    await connection.beginTransaction();

    // Get trash item
    const [trashItems] = await connection.query<RowDataPacket[]>(
      `SELECT * FROM trash WHERE trashId = ? AND userId = ?`,
      [trashId, userId]
    );

    if (trashItems.length === 0) {
      await connection.rollback();
      res.status(404).json({
        success: false,
        error: "Item not found in trash",
      });
      return;
    }

    const item = trashItems[0];

    // Delete from original table
    if (item.itemType === 'image') {
      await connection.query(
        `DELETE FROM images WHERE imageId = ? AND userId = ?`,
        [item.itemId, userId]
      );
    } else if (item.itemType === 'video') {
      await connection.query(
        `DELETE FROM videos WHERE videoId = ? AND userId = ?`,
        [item.itemId, userId]
      );
    }

    // Remove from trash
    await connection.query(
      `DELETE FROM trash WHERE trashId = ? AND userId = ?`,
      [trashId, userId]
    );

    await connection.commit();

    // Delete physical file
    try {
      await fs.unlink(item.originalPath);
      console.log(`✅ File deleted: ${item.originalPath}`);
    } catch (fsError) {
      console.error("Error deleting physical file:", fsError);
      // Don't fail if file doesn't exist
    }

    res.json({
      success: true,
      message: `${item.itemType} permanently deleted`,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error permanently deleting item:", error);
    res.status(500).json({
      success: false,
      error: "Error permanently deleting item",
    });
  } finally {
    connection.release();
  }
};

/**
 * Empty trash (delete all items)
 * DELETE /api/trash/empty
 */
export const emptyTrash = async (req: Request, res: Response): Promise<void> => {
  const connection = await pool.getConnection();
  try {
    const userId = req.user!.userId;

    await connection.beginTransaction();

    // Get all trash items
    const [trashItems] = await connection.query<RowDataPacket[]>(
      `SELECT * FROM trash WHERE userId = ?`,
      [userId]
    );

    if (trashItems.length === 0) {
      await connection.rollback();
      res.json({
        success: true,
        message: "Trash is already empty",
        data: { deletedCount: 0 },
      });
      return;
    }

    let deletedCount = 0;

    for (const item of trashItems) {
      // Delete from original table
      if (item.itemType === 'image') {
        await connection.query(
          `DELETE FROM images WHERE imageId = ? AND userId = ?`,
          [item.itemId, userId]
        );
      } else if (item.itemType === 'video') {
        await connection.query(
          `DELETE FROM videos WHERE videoId = ? AND userId = ?`,
          [item.itemId, userId]
        );
      }

      // Delete physical file
      try {
        await fs.unlink(item.originalPath);
      } catch (fsError) {
        console.error(`Error deleting file ${item.originalPath}:`, fsError);
      }

      deletedCount++;
    }

    // Clear trash table
    await connection.query(
      `DELETE FROM trash WHERE userId = ?`,
      [userId]
    );

    await connection.commit();

    res.json({
      success: true,
      message: `Trash emptied successfully`,
      data: { deletedCount },
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error emptying trash:", error);
    res.status(500).json({
      success: false,
      error: "Error emptying trash",
    });
  } finally {
    connection.release();
  }
};

// ============================================================================
// 🧹 CLEANUP EXPIRED ITEMS (Automatic)
// ============================================================================

/**
 * Clean expired trash items (for cron job)
 */
export const cleanExpiredTrash = async (): Promise<void> => {
  const connection = await pool.getConnection();
  try {
    console.log("🧹 Iniciando limpieza de papelera...");

    await connection.beginTransaction();

    // Get expired items (permanentDeleteAt <= NOW)
    const [expiredItems] = await connection.query<RowDataPacket[]>(
      `SELECT * FROM trash WHERE permanentDeleteAt <= NOW()`
    );

    if (expiredItems.length === 0) {
      console.log("✅ No hay elementos expirados en la papelera.");
      await connection.rollback();
      return;
    }

    console.log(`🗑️ Eliminando ${expiredItems.length} elementos expirados...`);

    for (const item of expiredItems) {
      // Delete from original table
      if (item.itemType === 'image') {
        await connection.query(
          `DELETE FROM images WHERE imageId = ? AND userId = ?`,
          [item.itemId, item.userId]
        );
      } else if (item.itemType === 'video') {
        await connection.query(
          `DELETE FROM videos WHERE videoId = ? AND userId = ?`,
          [item.itemId, item.userId]
        );
      }

      // Delete physical file
      try {
        await fs.unlink(item.originalPath);
        console.log(`✅ Archivo eliminado: ${item.originalPath}`);
      } catch (fsError) {
        console.warn(`⚠️ No se pudo eliminar archivo: ${item.originalPath}`, fsError);
      }
    }

    // Remove expired items from trash
    await connection.query(
      `DELETE FROM trash WHERE permanentDeleteAt <= NOW()`
    );

    await connection.commit();
    console.log(`✅ Limpieza completada. ${expiredItems.length} elementos eliminados.`);
  } catch (error) {
    await connection.rollback();
    console.error("❌ Error durante la limpieza de papelera:", error);
    throw error;
  } finally {
    connection.release();
  }
};