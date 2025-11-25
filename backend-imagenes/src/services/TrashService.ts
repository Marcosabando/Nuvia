import { Request, Response } from "express";
import { RowDataPacket, ResultSetHeader, PoolConnection } from "mysql2/promise";
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

    if (itemType && ["image", "video", "document", "folder"].includes(itemType)) {
      query += ` AND itemType = ?`;
      params.push(itemType);
    }

    query += ` ORDER BY deletedAt DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const [items] = await pool.query<RowDataPacket[]>(query, params);

    // Count total
    let countQuery = `SELECT COUNT(*) as total FROM trash WHERE userId = ?`;
    const countParams: any[] = [userId];

    if (itemType && ["image", "video", "document", "folder"].includes(itemType)) {
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
// 🛠️ HELPER FUNCTIONS
// ============================================================================
/**
 * Helper: Move item to trash
 */
const moveToTrash = async (
  connection: PoolConnection,
  userId: number,
  table: "images" | "videos",
  id: number,
  pathColumn: "imagePath" | "videoPath",
  type: "image" | "video"
): Promise<void> => {
  // Get item info
  const idColumn = table === "images" ? "imageId" : "videoId";
  const [rows] = await connection.query<RowDataPacket[]>(
    `SELECT * FROM ${table} WHERE ${idColumn} = ? AND userId = ? AND deletedAt IS NULL`,
    [id, userId]
  );

  if (rows.length === 0) {
    throw new Error(`${type} not found`);
  }

  const item = rows[0];

  // Mark as deleted
  await connection.query(
    `UPDATE ${table} SET deletedAt = CURRENT_TIMESTAMP WHERE ${idColumn} = ? AND userId = ?`,
    [id, userId]
  );

  // 🔥 CORRECCIÓN: Usar directamente el path de la base de datos
  let fullPath = item[pathColumn];
  
  console.log(`📁 Path original de BD para ${type}:`, fullPath);
  
  // Si ya tiene el formato correcto (uploads/userId/type/filename), usarlo directamente
  // Si no, construirlo
  if (!fullPath.startsWith('uploads/')) {
    fullPath = `uploads/${userId}/${type}s/${item.filename}`;
  }

  console.log(`✅ Path final guardado en trash para ${type}:`, fullPath);

  // Build metadata based on type
  const metadata = JSON.stringify(
    type === "image"
      ? { 
          width: item.width, 
          height: item.height, 
          title: item.title 
        }
      : { 
          width: item.width, 
          height: item.height, 
          duration: item.duration, 
          title: item.title,
          fps: item.fps,
          bitrate: item.bitrate,
          codec: item.codec
        }
  );

  // Insert into trash
  await connection.query(
    `INSERT INTO trash 
     (userId, itemType, itemId, originalName, originalPath, fileSize, mimeType, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      type,
      id,
      item.originalFilename || item.filename,
      fullPath, // 🔥 Path corregido
      item.fileSize,
      item.mimeType,
      metadata,
    ]
  );

  console.log(`✅ ${type} movido a trash correctamente:`, {
    itemId: id,
    originalName: item.originalFilename || item.filename,
    savedPath: fullPath
  });
};

/**
 * Helper: Restore item from trash
 */
const restoreFromTrash = async (
  connection: PoolConnection,
  userId: number,
  itemType: "image" | "video",
  itemId: number
): Promise<void> => {
  const table = itemType === "image" ? "images" : "videos";
  const idColumn = table === "images" ? "imageId" : "videoId";

  // Restore in original table
  await connection.query(
    `UPDATE ${table} SET deletedAt = NULL, updatedAt = CURRENT_TIMESTAMP 
     WHERE ${idColumn} = ? AND userId = ?`,
    [itemId, userId]
  );

  // Remove from trash
  await connection.query(
    `DELETE FROM trash WHERE itemType = ? AND itemId = ? AND userId = ?`,
    [itemType, itemId, userId]
  );
};

/**
 * Helper: Delete trash item permanently
 */
const deleteTrashItem = async (connection: PoolConnection, item: RowDataPacket): Promise<void> => {
  const table = item.itemType === "image" ? "images" : "videos";
  const idColumn = table === "images" ? "imageId" : "videoId";

  // Delete from original table
  await connection.query(
    `DELETE FROM ${table} WHERE ${idColumn} = ? AND userId = ?`,
    [item.itemId, item.userId]
  );

  // Delete from trash
  await connection.query(
    `DELETE FROM trash WHERE trashId = ?`,
    [item.trashId]
  );

  // Delete physical file
  try {
    await fs.unlink(item.originalPath);
    console.log(`✅ Archivo eliminado: ${item.originalPath}`);
  } catch (err) {
    console.warn(`⚠️ No se pudo eliminar archivo: ${item.originalPath}`, err);
  }
};

// ============================================================================
// 🗑️ SOFT DELETE (TRASH) - IMAGES & VIDEOS
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
    await moveToTrash(connection, userId, "images", imageId, "imagePath", "image");
    await connection.commit();

    res.json({
      success: true,
      message: "Image moved to trash",
      data: { imageId },
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
    await moveToTrash(connection, userId, "videos", videoId, "videoPath", "video");
    await connection.commit();

    res.json({
      success: true,
      message: "Video moved to trash",
      data: { videoId },
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

// ============================================================================
// ♻️ RESTORE ITEMS
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
    await restoreFromTrash(connection, userId, item.itemType, item.itemId);

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

      await restoreFromTrash(connection, userId, item.itemType, item.itemId);

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

    // Delete permanently
    await deleteTrashItem(connection, item);

    await connection.commit();

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

    // Delete all items
    for (const item of trashItems) {
      await deleteTrashItem(connection, item);
    }

    // Clear trash table
    await connection.query(
      `DELETE FROM trash WHERE userId = ?`,
      [userId]
    );

    await connection.commit();

    res.json({
      success: true,
      message: "Trash emptied successfully",
      data: { deletedCount: trashItems.length },
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

    // Delete all expired items
    for (const item of expiredItems) {
      await deleteTrashItem(connection, item);
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