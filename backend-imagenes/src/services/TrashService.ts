// src/services/trash.service.ts
import { Request, Response } from "express";
import { PrismaClient } from '@prisma/client';
import fs from "fs/promises";

// ============================================================================
// 📋 GET TRASH ITEMS
// ============================================================================

export const getTrashItems = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;
    const itemType = req.query.type as string;

    const prisma = new PrismaClient();

    const whereClause: any = {
      userId: userId
    };

    if (itemType && ["image", "video", "document", "folder"].includes(itemType)) {
      whereClause.itemType = itemType;
    }

    const items = await prisma.trash.findMany({
      where: whereClause,
      orderBy: {
        deletedAt: 'desc'
      },
      skip: offset,
      take: limit
    });

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
    res.status(500).json({
      success: false,
      error: "Error getting trash items",
    });
  }
};

export const getTrashStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const prisma = new PrismaClient();

    const trashItems = await prisma.trash.findMany({
      where: { userId: userId }
    });

    const totalItems = trashItems.length;
    const totalSize = trashItems.reduce((sum: number, item: any) => sum + Number(item.fileSize), 0);
    const totalImages = trashItems.filter((item: any) => item.itemType === 'image').length;
    const totalVideos = trashItems.filter((item: any) => item.itemType === 'video').length;
    
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
    res.status(500).json({
      success: false,
      error: "Error getting trash statistics",
    });
  }
};

// ============================================================================
// 🛠️ HELPER FUNCTIONS
// ============================================================================

const moveToTrash = async (
  prisma: PrismaClient,
  userId: number,
  table: "images" | "videos",
  id: number,
  type: "image" | "video"
): Promise<void> => {
  try {
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
    
    if (!originalPath.startsWith('uploads/')) {
      originalPath = `uploads/${userId}/${type}s/${item.filename}`;
    }

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

    const permanentDeleteAt = new Date();
    permanentDeleteAt.setDate(permanentDeleteAt.getDate() + 30);

    await prisma.$transaction(async (tx: any) => {
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
  } catch (error) {
    throw error;
  }
};

const restoreFromTrash = async (
  prisma: PrismaClient,
  userId: number,
  itemType: "image" | "video",
  itemId: number
): Promise<void> => {
  await prisma.$transaction(async (tx: any) => {
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

    await tx.trash.deleteMany({
      where: {
        itemType: itemType,
        itemId: itemId,
        userId: userId
      }
    });
  });
};

const deleteTrashItem = async (prisma: PrismaClient, item: any): Promise<void> => {
  try {
    await prisma.$transaction(async (tx: any) => {
      if (item.itemType === "image") {
        await tx.images.delete({
          where: { imageId: item.itemId }
        });
      } else {
        await tx.videos.delete({
          where: { videoId: item.itemId }
        });
      }

      await tx.trash.delete({
        where: { trashId: item.trashId }
      });
    });

    try {
      await fs.unlink(item.originalPath);
    } catch (err) {}
  } catch (error) {
    throw error;
  }
};

// ============================================================================
// 🗑️ SOFT DELETE (TRASH) - IMAGES & VIDEOS
// ============================================================================

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
    res.status(500).json({
      success: false,
      error: "Error moving image to trash",
      details: (error as Error).message,
    });
  }
};

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

export const restoreItem = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const trashId = parseInt(req.params.id);

    const prisma = new PrismaClient();

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
    res.status(500).json({
      success: false,
      error: "Error restoring item",
      details: (error as Error).message,
    });
  }
};

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

    const trashItems = await prisma.trash.findMany({
      where: {
        trashId: { in: ids },
        userId: userId
      }
    });

    let restoredCount = 0;

    for (const item of trashItems) {
      try {
        await restoreFromTrash(prisma, userId, item.itemType as "image" | "video", item.itemId);
        restoredCount++;
      } catch (error) {}
    }

    await prisma.$disconnect();

    res.json({
      success: true,
      message: `${restoredCount} items restored successfully`,
      data: { restoredCount },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Error restoring items",
    });
  }
};

// ============================================================================
// 🔥 PERMANENT DELETE
// ============================================================================

export const deleteItemPermanently = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const trashId = parseInt(req.params.id);

    const prisma = new PrismaClient();

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

    await deleteTrashItem(prisma, trashItem);
    await prisma.$disconnect();

    res.json({
      success: true,
      message: `${trashItem.itemType} permanently deleted`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Error permanently deleting item",
    });
  }
};

export const emptyTrash = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const prisma = new PrismaClient();

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

    for (const item of trashItems) {
      try {
        await deleteTrashItem(prisma, item);
      } catch (error) {}
    }

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
    res.status(500).json({
      success: false,
      error: "Error emptying trash",
    });
  }
};

// ============================================================================
// 🧹 CLEANUP EXPIRED ITEMS (Automatic)
// ============================================================================

export const cleanExpiredTrash = async (): Promise<void> => {
  try {
    const prisma = new PrismaClient();

    const expiredItems = await prisma.trash.findMany({
      where: {
        permanentDeleteAt: {
          lte: new Date()
        }
      }
    });

    if (expiredItems.length === 0) {
      await prisma.$disconnect();
      return;
    }

    for (const item of expiredItems) {
      try {
        await deleteTrashItem(prisma, item);
      } catch (error) {}
    }

    await prisma.trash.deleteMany({
      where: {
        permanentDeleteAt: {
          lte: new Date()
        }
      }
    });

    await prisma.$disconnect();
  } catch (error) {
    throw error;
  }
};