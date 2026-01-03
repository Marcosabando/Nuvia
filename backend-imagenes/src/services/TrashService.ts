// src/services/trash.service.ts
import { Request, Response } from "express";
import { PrismaClient } from '@prisma/client';
import fs from "fs/promises";

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

    const prisma = new PrismaClient();

    // Build where clause
    const whereClause: any = {
      userId: userId
    };

    if (itemType && ["image", "video", "document", "folder"].includes(itemType)) {
      whereClause.itemType = itemType;
    }

    // Get items with pagination
    const items = await prisma.trash.findMany({
      where: whereClause,
      orderBy: {
        deletedAt: 'desc'
      },
      skip: offset,
      take: limit
    });

    // Count total
    const total = await prisma.trash.count({
      where: whereClause
    });

    await prisma.$disconnect();

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

    const prisma = new PrismaClient();

    // Get all trash items for user
    const trashItems = await prisma.trash.findMany({
      where: { userId: userId }
    });

    // Calculate stats
    const totalItems = trashItems.length;
    const totalSize = trashItems.reduce((sum: number, item: any) => sum + Number(item.fileSize), 0);
    const totalImages = trashItems.filter((item: any) => item.itemType === 'image').length;
    const totalVideos = trashItems.filter((item: any) => item.itemType === 'video').length;
    
    // Calculate expiring soon (within 7 days)
    const now = new Date();
    const weekFromNow = new Date();
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    
    const expiringSoon = trashItems.filter((item: any) => {
      if (!item.permanentDeleteAt) return false;
      return item.permanentDeleteAt <= weekFromNow;
    }).length;

    await prisma.$disconnect();

    res.json({
      success: true,
      data: {
        totalItems,
        totalSize,
        totalSizeFormatted: (totalSize / (1024 * 1024)).toFixed(2) + " MB",
        totalImages,
        totalVideos,
        expiringSoon,
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
  prisma: PrismaClient,
  userId: number,
  table: "images" | "videos",
  id: number,
  type: "image" | "video"
): Promise<void> => {
  try {
    // Get item info based on type
    let item: any;
    let originalPath: string;
    let originalFilename: string;

    if (type === "image") {
      item = await prisma.images.findFirst({
        where: {
          imageId: id,
          userId: userId,
          deletedAt: null
        }
      });

      if (!item) {
        throw new Error("Image not found");
      }

      originalPath = item.imagePath;
      originalFilename = item.originalFilename || item.filename;
    } else {
      item = await prisma.videos.findFirst({
        where: {
          videoId: id,
          userId: userId,
          deletedAt: null
        }
      });

      if (!item) {
        throw new Error("Video not found");
      }

      originalPath = item.videoPath;
      originalFilename = item.originalFilename || item.filename;
    }

    console.log(`📁 Path original de BD para ${type}:`, originalPath);
    
    // Si ya tiene el formato correcto (uploads/userId/type/filename), usarlo directamente
    // Si no, construirlo
    if (!originalPath.startsWith('uploads/')) {
      originalPath = `uploads/${userId}/${type}s/${item.filename}`;
    }

    console.log(`✅ Path final guardado en trash para ${type}:`, originalPath);

    // Build metadata based on type
    const metadata = type === "image"
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
        };

    // Calculate permanent delete date (30 days from now)
    const permanentDeleteAt = new Date();
    permanentDeleteAt.setDate(permanentDeleteAt.getDate() + 30);

    // Start transaction
    await prisma.$transaction(async (tx: any) => {
      // Mark as deleted in original table
      if (type === "image") {
        await tx.images.update({
          where: { imageId: id },
          data: { deletedAt: new Date() }
        });
      } else {
        await tx.videos.update({
          where: { videoId: id },
          data: { deletedAt: new Date() }
        });
      }

      // Insert into trash
      await tx.trash.create({
        data: {
          userId: userId,
          itemType: type,
          itemId: id,
          originalName: originalFilename,
          originalPath: originalPath,
          fileSize: item.fileSize.toString(),
          mimeType: item.mimeType,
          metadata: JSON.stringify(metadata),
          deletedAt: new Date(),
          permanentDeleteAt: permanentDeleteAt
        }
      });
    });

    console.log(`✅ ${type} movido a trash correctamente:`, {
      itemId: id,
      originalName: originalFilename,
      savedPath: originalPath
    });
  } catch (error) {
    console.error(`Error moving ${type} to trash:`, error);
    throw error;
  }
};

/**
 * Helper: Restore item from trash
 */
const restoreFromTrash = async (
  prisma: PrismaClient,
  userId: number,
  itemType: "image" | "video",
  itemId: number
): Promise<void> => {
  await prisma.$transaction(async (tx: any) => {
    // Restore in original table
    if (itemType === "image") {
      await tx.images.update({
        where: { imageId: itemId },
        data: { deletedAt: null, updatedAt: new Date() }
      });
    } else {
      await tx.videos.update({
        where: { videoId: itemId },
        data: { deletedAt: null, updatedAt: new Date() }
      });
    }

    // Remove from trash
    await tx.trash.deleteMany({
      where: {
        itemType: itemType,
        itemId: itemId,
        userId: userId
      }
    });
  });
};

/**
 * Helper: Delete trash item permanently
 */
const deleteTrashItem = async (prisma: PrismaClient, item: any): Promise<void> => {
  try {
    // Start transaction
    await prisma.$transaction(async (tx: any) => {
      // Delete from original table
      if (item.itemType === "image") {
        await tx.images.delete({
          where: { imageId: item.itemId }
        });
      } else {
        await tx.videos.delete({
          where: { videoId: item.itemId }
        });
      }

      // Delete from trash
      await tx.trash.delete({
        where: { trashId: item.trashId }
      });
    });

    // Delete physical file
    try {
      await fs.unlink(item.originalPath);
      console.log(`✅ Archivo eliminado: ${item.originalPath}`);
    } catch (err) {
      console.warn(`⚠️ No se pudo eliminar archivo: ${item.originalPath}`, err);
    }
  } catch (error) {
    console.error("Error deleting trash item:", error);
    throw error;
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
  try {
    const userId = req.user!.userId;
    const imageId = parseInt(req.params.id);
    
    const prisma = new PrismaClient();
    await moveToTrash(prisma, userId, "images", imageId, "image");
    await prisma.$disconnect();

    res.json({
      success: true,
      message: "Image moved to trash",
      data: { imageId },
    });
  } catch (error) {
    console.error("Error moving image to trash:", error);
    res.status(500).json({
      success: false,
      error: "Error moving image to trash",
      details: (error as Error).message,
    });
  }
};

/**
 * Move video to trash (soft delete)
 * DELETE /api/videos/:id
 */
export const softDeleteVideo = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const videoId = parseInt(req.params.id);
    
    const prisma = new PrismaClient();
    await moveToTrash(prisma, userId, "videos", videoId, "video");
    await prisma.$disconnect();

    res.json({
      success: true,
      message: "Video moved to trash",
      data: { videoId },
    });
  } catch (error) {
    console.error("Error moving video to trash:", error);
    res.status(500).json({
      success: false,
      error: "Error moving video to trash",
      details: (error as Error).message,
    });
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
  try {
    const userId = req.user!.userId;
    const trashId = parseInt(req.params.id);

    const prisma = new PrismaClient();

    // Get trash item
    const trashItem = await prisma.trash.findFirst({
      where: {
        trashId: trashId,
        userId: userId
      }
    });

    if (!trashItem) {
      await prisma.$disconnect();
      res.status(404).json({
        success: false,
        error: "Item not found in trash",
      });
      return;
    }

    // Restore based on type
    await restoreFromTrash(prisma, userId, trashItem.itemType as "image" | "video", trashItem.itemId);
    await prisma.$disconnect();

    res.json({
      success: true,
      message: `${trashItem.itemType} restored successfully`,
      data: {
        itemType: trashItem.itemType,
        itemId: trashItem.itemId,
        originalName: trashItem.originalName,
      },
    });
  } catch (error) {
    console.error("Error restoring item:", error);
    res.status(500).json({
      success: false,
      error: "Error restoring item",
      details: (error as Error).message,
    });
  }
};

/**
 * Restore multiple items
 * POST /api/trash/restore-multiple
 * Body: { ids: number[] }
 */
export const restoreMultipleItems = async (req: Request, res: Response): Promise<void> => {
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

    const prisma = new PrismaClient();

    // Get all trash items
    const trashItems = await prisma.trash.findMany({
      where: {
        trashId: { in: ids },
        userId: userId
      }
    });

    let restoredCount = 0;

    // Restore each item
    for (const item of trashItems) {
      try {
        await restoreFromTrash(prisma, userId, item.itemType as "image" | "video", item.itemId);
        restoredCount++;
      } catch (error) {
        console.error(`Error restoring item ${item.trashId}:`, error);
        // Continue with other items
      }
    }

    await prisma.$disconnect();

    res.json({
      success: true,
      message: `${restoredCount} items restored successfully`,
      data: { restoredCount },
    });
  } catch (error) {
    console.error("Error restoring multiple items:", error);
    res.status(500).json({
      success: false,
      error: "Error restoring items",
    });
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
  try {
    const userId = req.user!.userId;
    const trashId = parseInt(req.params.id);

    const prisma = new PrismaClient();

    // Get trash item
    const trashItem = await prisma.trash.findFirst({
      where: {
        trashId: trashId,
        userId: userId
      }
    });

    if (!trashItem) {
      await prisma.$disconnect();
      res.status(404).json({
        success: false,
        error: "Item not found in trash",
      });
      return;
    }

    // Delete permanently
    await deleteTrashItem(prisma, trashItem);
    await prisma.$disconnect();

    res.json({
      success: true,
      message: `${trashItem.itemType} permanently deleted`,
    });
  } catch (error) {
    console.error("Error permanently deleting item:", error);
    res.status(500).json({
      success: false,
      error: "Error permanently deleting item",
    });
  }
};

/**
 * Empty trash (delete all items)
 * DELETE /api/trash/empty
 */
export const emptyTrash = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const prisma = new PrismaClient();

    // Get all trash items
    const trashItems = await prisma.trash.findMany({
      where: { userId: userId }
    });

    if (trashItems.length === 0) {
      await prisma.$disconnect();
      res.json({
        success: true,
        message: "Trash is already empty",
        data: { deletedCount: 0 },
      });
      return;
    }

    // Delete all items
    for (const item of trashItems) {
      try {
        await deleteTrashItem(prisma, item);
      } catch (error) {
        console.error(`Error deleting item ${item.trashId}:`, error);
        // Continue with other items
      }
    }

    // Clear trash table (though items should already be deleted one by one)
    await prisma.trash.deleteMany({
      where: { userId: userId }
    });

    await prisma.$disconnect();

    res.json({
      success: true,
      message: "Trash emptied successfully",
      data: { deletedCount: trashItems.length },
    });
  } catch (error) {
    console.error("Error emptying trash:", error);
    res.status(500).json({
      success: false,
      error: "Error emptying trash",
    });
  }
};

// ============================================================================
// 🧹 CLEANUP EXPIRED ITEMS (Automatic)
// ============================================================================

/**
 * Clean expired trash items (for cron job)
 */
export const cleanExpiredTrash = async (): Promise<void> => {
  try {
    console.log("🧹 Iniciando limpieza de papelera...");

    const prisma = new PrismaClient();

    // Get expired items (permanentDeleteAt <= NOW)
    const expiredItems = await prisma.trash.findMany({
      where: {
        permanentDeleteAt: {
          lte: new Date()
        }
      }
    });

    if (expiredItems.length === 0) {
      console.log("✅ No hay elementos expirados en la papelera.");
      await prisma.$disconnect();
      return;
    }

    console.log(`🗑️ Eliminando ${expiredItems.length} elementos expirados...`);

    // Delete all expired items
    for (const item of expiredItems) {
      try {
        await deleteTrashItem(prisma, item);
      } catch (error) {
        console.error(`Error eliminando item expirado ${item.trashId}:`, error);
        // Continue with other items
      }
    }

    // Remove expired items from trash (they should already be deleted)
    await prisma.trash.deleteMany({
      where: {
        permanentDeleteAt: {
          lte: new Date()
        }
      }
    });

    await prisma.$disconnect();
    console.log(`✅ Limpieza completada. ${expiredItems.length} elementos eliminados.`);
  } catch (error) {
    console.error("❌ Error durante la limpieza de papelera:", error);
    throw error;
  }
};