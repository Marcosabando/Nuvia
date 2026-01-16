// src/services/recents.service.ts
import { Request, Response } from "express";
import prisma from '../lib/prisma';

// ============================================================================
// 🛠️ HELPER FUNCTIONS
// ============================================================================

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};

const getDateFilter = (timeFilter: string): { gte?: Date } => {
  const now = new Date();
  let filterDate = new Date();

  switch (timeFilter) {
    case "today":
      filterDate.setHours(0, 0, 0, 0);
      return { gte: filterDate };
    case "week":
      filterDate.setDate(now.getDate() - 7);
      return { gte: filterDate };
    case "month":
      filterDate.setDate(now.getDate() - 30);
      return { gte: filterDate };
    default:
      return {};
  }
};

// ============================================================================
// 📋 OBTENER ITEMS RECIENTES (imágenes + videos combinados)
// ============================================================================
export const getRecentItems = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Usuario no autenticado"
      });
    }

    const { timeFilter = "week", limit = 20 } = req.query;
    const dateFilter = getDateFilter(timeFilter as string);

    const recentImages = await prisma.images.findMany({
      where: {
        userId: userId,
        deletedAt: null,
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
      },
      select: {
        imageId: true,
        title: true,
        originalFilename: true,
        imagePath: true,
        thumbnailPath: true,
        fileSize: true,
        mimeType: true,
        createdAt: true,
        updatedAt: true,
        width: true,
        height: true,
        isFavorite: true,
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: parseInt(limit as string)
    });

    const recentVideos = await prisma.videos.findMany({
      where: {
        userId: userId,
        deletedAt: null,
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
      },
      select: {
        videoId: true,
        title: true,
        originalFilename: true,
        videoPath: true,
        thumbnailPath: true,
        fileSize: true,
        mimeType: true,
        createdAt: true,
        updatedAt: true,
        width: true,
        height: true,
        isFavorite: true,
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: parseInt(limit as string)
    });

    const allItems = [
      ...recentImages.map((img) => ({
        id: img.imageId,
        type: "image" as const,
        name: img.originalFilename,
        title: img.title || img.originalFilename,
        path: img.imagePath,
        thumbnailPath: img.thumbnailPath,
        fileSize: img.fileSize,
        mimeType: img.mimeType,
        uploadDate: img.createdAt || new Date(),
        updatedAt: img.updatedAt || new Date(),
        width: img.width,
        height: img.height,
        isFavorite: img.isFavorite || false,
      })),
      ...recentVideos.map((vid) => ({
        id: vid.videoId,
        type: "video" as const,
        name: vid.originalFilename,
        title: vid.title || vid.originalFilename,
        path: vid.videoPath,
        thumbnailPath: vid.thumbnailPath,
        fileSize: vid.fileSize,
        mimeType: vid.mimeType,
        uploadDate: vid.createdAt || new Date(),
        updatedAt: vid.updatedAt || new Date(),
        width: vid.width,
        height: vid.height,
        isFavorite: vid.isFavorite || false,
      }))
    ].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
     .slice(0, parseInt(limit as string));

    const formattedItems = allItems.map((item) => ({
      id: item.id,
      type: item.type,
      name: item.name,
      title: item.title,
      path: item.path,
      thumbnailPath: item.thumbnailPath,
      size: formatFileSize(Number(item.fileSize)),
      sizeBytes: Number(item.fileSize),
      mimeType: item.mimeType,
      uploadedAt: item.uploadDate,
      accessedAt: item.updatedAt,
      dimensions: item.width && item.height ? `${item.width}x${item.height}` : null,
      isFavorite: item.isFavorite,
    }));

    return res.json({
      success: true,
      data: formattedItems,
      count: formattedItems.length,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: "Error al obtener elementos recientes"
    });
  }
};

// ============================================================================
// 📊 OBTENER ESTADÍSTICAS DE RECIENTES
// ============================================================================
export const getRecentStats = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Usuario no autenticado"
      });
    }

    const lastImage = await prisma.images.findFirst({
      where: { userId: userId, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true }
    });

    const lastVideo = await prisma.videos.findFirst({
      where: { userId: userId, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
      select: { updatedAt: true }
    });

    const lastImageDate = lastImage?.updatedAt || null;
    const lastVideoDate = lastVideo?.updatedAt || null;

    let lastActivity = null;
    if (lastImageDate && lastVideoDate) {
      lastActivity = lastImageDate > lastVideoDate ? lastImageDate : lastVideoDate;
    } else if (lastImageDate) {
      lastActivity = lastImageDate;
    } else if (lastVideoDate) {
      lastActivity = lastVideoDate;
    }

    const mostRecentImage = await prisma.images.findFirst({
      where: { userId: userId, deletedAt: null },
      orderBy: { updatedAt: 'desc' },
      select: {
        title: true,
        originalFilename: true,
        updatedAt: true
      }
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayImages = await prisma.images.count({
      where: {
        userId: userId,
        deletedAt: null,
        createdAt: { gte: today }
      }
    });

    const todayVideos = await prisma.videos.count({
      where: {
        userId: userId,
        deletedAt: null,
        createdAt: { gte: today }
      }
    });

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const weekImages = await prisma.images.count({
      where: {
        userId: userId,
        deletedAt: null,
        createdAt: { gte: weekAgo }
      }
    });

    const weekVideos = await prisma.videos.count({
      where: {
        userId: userId,
        deletedAt: null,
        createdAt: { gte: weekAgo }
      }
    });

    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 30);

    const monthImages = await prisma.images.count({
      where: {
        userId: userId,
        deletedAt: null,
        createdAt: { gte: monthAgo }
      }
    });

    const monthVideos = await prisma.videos.count({
      where: {
        userId: userId,
        deletedAt: null,
        createdAt: { gte: monthAgo }
      }
    });

    return res.json({
      success: true,
      data: {
        lastActivity: lastActivity,
        mostRecent: mostRecentImage ? {
          name: mostRecentImage.title || mostRecentImage.originalFilename,
          updatedAt: mostRecentImage.updatedAt,
          type: 'image'
        } : null,
        counts: {
          today: todayImages + todayVideos,
          week: weekImages + weekVideos,
          month: monthImages + monthVideos,
        },
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: "Error al obtener estadísticas"
    });
  }
};

// ============================================================================
// 🖼️ OBTENER SOLO IMÁGENES RECIENTES
// ============================================================================
export const getRecentImages = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Usuario no autenticado"
      });
    }

    const { limit = 10 } = req.query;

    const images = await prisma.images.findMany({
      where: {
        userId: userId,
        deletedAt: null
      },
      select: {
        imageId: true,
        title: true,
        originalFilename: true,
        imagePath: true,
        thumbnailPath: true,
        fileSize: true,
        mimeType: true,
        createdAt: true,
        updatedAt: true,
        width: true,
        height: true,
        isFavorite: true,
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: parseInt(limit as string)
    });

    const formattedImages = images.map((img) => ({
      id: img.imageId,
      type: 'image' as const,
      name: img.originalFilename,
      title: img.title || img.originalFilename,
      path: img.imagePath,
      thumbnailPath: img.thumbnailPath,
      size: formatFileSize(Number(img.fileSize)),
      sizeBytes: Number(img.fileSize),
      mimeType: img.mimeType,
      uploadedAt: img.createdAt || new Date(),
      accessedAt: img.updatedAt || new Date(),
      dimensions: img.width && img.height ? `${img.width}x${img.height}` : null,
      isFavorite: img.isFavorite || false,
    }));

    return res.json({
      success: true,
      data: formattedImages,
      count: formattedImages.length,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: "Error al obtener imágenes recientes"
    });
  }
};

// ============================================================================
// 🎬 OBTENER SOLO VIDEOS RECIENTES
// ============================================================================
export const getRecentVideos = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Usuario no autenticado"
      });
    }

    const { limit = 10 } = req.query;

    const videos = await prisma.videos.findMany({
      where: {
        userId: userId,
        deletedAt: null
      },
      select: {
        videoId: true,
        title: true,
        originalFilename: true,
        videoPath: true,
        thumbnailPath: true,
        fileSize: true,
        mimeType: true,
        createdAt: true,
        updatedAt: true,
        width: true,
        height: true,
        isFavorite: true,
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: parseInt(limit as string)
    });

    const formattedVideos = videos.map((vid) => ({
      id: vid.videoId,
      type: 'video' as const,
      name: vid.originalFilename,
      title: vid.title || vid.originalFilename,
      path: vid.videoPath,
      thumbnailPath: vid.thumbnailPath,
      size: formatFileSize(Number(vid.fileSize)),
      sizeBytes: Number(vid.fileSize),
      mimeType: vid.mimeType,
      uploadedAt: vid.createdAt || new Date(),
      accessedAt: vid.updatedAt || new Date(),
      dimensions: vid.width && vid.height ? `${vid.width}x${vid.height}` : null,
      isFavorite: vid.isFavorite || false,
    }));

    return res.json({
      success: true,
      data: formattedVideos,
      count: formattedVideos.length,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: "Error al obtener videos recientes"
    });
  }
};

// ============================================================================
// 📈 OBTENER LÍNEA DE TIEMPO AGRUPADA POR FECHA
// ============================================================================
export const getTimeline = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Usuario no autenticado"
      });
    }

    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days as string));

    const imageStats = await prisma.$queryRaw<Array<{
      date: Date;
      count: bigint;
      totalSize: bigint;
    }>>`
      SELECT 
        DATE(createdAt) as date,
        COUNT(*) as count,
        SUM(fileSize) as totalSize
      FROM images
      WHERE userId = ${userId} 
        AND deletedAt IS NULL 
        AND createdAt >= ${startDate}
      GROUP BY DATE(createdAt)
      ORDER BY date DESC
    `;

    const videoStats = await prisma.$queryRaw<Array<{
      date: Date;
      count: bigint;
      totalSize: bigint;
    }>>`
      SELECT 
        DATE(createdAt) as date,
        COUNT(*) as count,
        SUM(fileSize) as totalSize
      FROM videos
      WHERE userId = ${userId} 
        AND deletedAt IS NULL 
        AND createdAt >= ${startDate}
      GROUP BY DATE(createdAt)
      ORDER BY date DESC
    `;

    const timelineMap = new Map<string, {
      date: Date;
      count: number;
      totalSize: number;
    }>();

    imageStats.forEach((stat) => {
      const dateStr = stat.date.toISOString().split('T')[0];
      timelineMap.set(dateStr, {
        date: stat.date,
        count: Number(stat.count),
        totalSize: Number(stat.totalSize) || 0,
      });
    });

    videoStats.forEach((stat) => {
      const dateStr = stat.date.toISOString().split('T')[0];
      if (timelineMap.has(dateStr)) {
        const existing = timelineMap.get(dateStr)!;
        existing.count += Number(stat.count);
        existing.totalSize += Number(stat.totalSize) || 0;
      } else {
        timelineMap.set(dateStr, {
          date: stat.date,
          count: Number(stat.count),
          totalSize: Number(stat.totalSize) || 0,
        });
      }
    });

    const timeline = Array.from(timelineMap.values())
      .map(day => ({
        date: day.date,
        count: day.count,
        totalSize: formatFileSize(day.totalSize),
        totalSizeBytes: day.totalSize,
      }))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return res.json({
      success: true,
      data: timeline,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: "Error al obtener línea de tiempo"
    });
  }
};

// ============================================================================
// 🔥 OBTENER ITEMS MÁS VISTOS/ACCEDIDOS
// ============================================================================
export const getMostViewed = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Usuario no autenticado"
      });
    }

    const { limit = 10 } = req.query;

    const recentImages = await prisma.images.findMany({
      where: {
        userId: userId,
        deletedAt: null
      },
      select: {
        imageId: true,
        title: true,
        originalFilename: true,
        imagePath: true,
        thumbnailPath: true,
        fileSize: true,
        updatedAt: true,
        isFavorite: true,
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: parseInt(limit as string)
    });

    const recentVideos = await prisma.videos.findMany({
      where: {
        userId: userId,
        deletedAt: null
      },
      select: {
        videoId: true,
        title: true,
        originalFilename: true,
        videoPath: true,
        thumbnailPath: true,
        fileSize: true,
        updatedAt: true,
        isFavorite: true,
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: parseInt(limit as string)
    });

    const allItems = [
      ...recentImages.map((img) => ({
        id: img.imageId,
        type: 'image' as const,
        name: img.title || img.originalFilename,
        path: img.imagePath,
        thumbnailPath: img.thumbnailPath,
        fileSize: img.fileSize,
        updatedAt: img.updatedAt || new Date(),
        isFavorite: img.isFavorite || false,
      })),
      ...recentVideos.map((vid) => ({
        id: vid.videoId,
        type: 'video' as const,
        name: vid.title || vid.originalFilename,
        path: vid.videoPath,
        thumbnailPath: vid.thumbnailPath,
        fileSize: vid.fileSize,
        updatedAt: vid.updatedAt || new Date(),
        isFavorite: vid.isFavorite || false,
      }))
    ].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
     .slice(0, parseInt(limit as string));

    const formattedItems = allItems.map((item) => ({
      id: item.id,
      type: item.type,
      name: item.name,
      path: item.path,
      thumbnailPath: item.thumbnailPath,
      size: formatFileSize(Number(item.fileSize)),
      sizeBytes: Number(item.fileSize),
      lastAccessed: item.updatedAt,
      isFavorite: item.isFavorite,
    }));

    return res.json({
      success: true,
      data: formattedItems,
      count: formattedItems.length,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: "Error al obtener items más vistos"
    });
  }
};

// ============================================================================
// 🆕 OBTENER ACTIVIDAD RECIENTE POR TIPO
// ============================================================================
export const getRecentActivity = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Usuario no autenticado"
      });
    }

    const { limit = 20 } = req.query;

    const recentImages = await prisma.images.findMany({
      where: {
        userId: userId,
        deletedAt: null,
        updatedAt: { not: null }
      },
      select: {
        imageId: true,
        title: true,
        originalFilename: true,
        imagePath: true,
        thumbnailPath: true,
        fileSize: true,
        mimeType: true,
        updatedAt: true,
        isFavorite: true,
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: parseInt(limit as string)
    });

    const recentVideos = await prisma.videos.findMany({
      where: {
        userId: userId,
        deletedAt: null,
        updatedAt: { not: null }
      },
      select: {
        videoId: true,
        title: true,
        originalFilename: true,
        videoPath: true,
        thumbnailPath: true,
        fileSize: true,
        mimeType: true,
        updatedAt: true,
        isFavorite: true,
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: parseInt(limit as string)
    });

    const allActivity = [
      ...recentImages.map((img) => ({
        id: img.imageId,
        type: 'image' as const,
        name: img.title || img.originalFilename,
        originalName: img.originalFilename,
        path: img.imagePath,
        thumbnailPath: img.thumbnailPath,
        fileSize: img.fileSize,
        mimeType: img.mimeType,
        updatedAt: img.updatedAt!,
        isFavorite: img.isFavorite || false,
        action: 'updated' as const,
      })),
      ...recentVideos.map((vid) => ({
        id: vid.videoId,
        type: 'video' as const,
        name: vid.title || vid.originalFilename,
        originalName: vid.originalFilename,
        path: vid.videoPath,
        thumbnailPath: vid.thumbnailPath,
        fileSize: vid.fileSize,
        mimeType: vid.mimeType,
        updatedAt: vid.updatedAt!,
        isFavorite: vid.isFavorite || false,
        action: 'updated' as const,
      }))
    ].sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
     .slice(0, parseInt(limit as string));

    const formattedActivity = allActivity.map((item) => ({
      id: item.id,
      type: item.type,
      name: item.name,
      originalName: item.originalName,
      path: item.path,
      thumbnailPath: item.thumbnailPath,
      size: formatFileSize(Number(item.fileSize)),
      mimeType: item.mimeType,
      updatedAt: item.updatedAt,
      isFavorite: item.isFavorite,
      action: item.action,
    }));

    return res.json({
      success: true,
      data: formattedActivity,
      count: formattedActivity.length,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: "Error al obtener actividad reciente"
    });
  }
};