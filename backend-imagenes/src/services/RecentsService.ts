// 📂 UBICACIÓN: src/services/RecentsService.ts

import { Request, Response } from "express";
import pool from "@src/config/database";
import { RowDataPacket } from "mysql2";

interface RecentItem extends RowDataPacket {
  id: number;
  type: "image" | "video";
  title: string | null;
  originalFilename: string;
  path: string;
  thumbnailPath: string | null;
  fileSize: number;
  mimeType: string;
  uploadDate: Date;
  updatedAt: Date;
  width: number | null;
  height: number | null;
  isFavorite: boolean;
}

// ============================================================================
// 📋 OBTENER ITEMS RECIENTES (imágenes + videos combinados)
// ============================================================================
export const getRecentItems = async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const { timeFilter = "week", limit = 20 } = req.query;

  try {
    // Calcular fecha de filtro
    let dateFilter = "";
    switch (timeFilter) {
      case "today":
        dateFilter = "AND DATE(uploadDate) = CURDATE()";
        break;
      case "week":
        dateFilter = "AND uploadDate >= DATE_SUB(NOW(), INTERVAL 7 DAY)";
        break;
      case "month":
        dateFilter = "AND uploadDate >= DATE_SUB(NOW(), INTERVAL 30 DAY)";
        break;
      default:
        dateFilter = "";
    }

    // Query unificado para imágenes y videos
    const query = `
      SELECT * FROM (
        SELECT 
          imageId as id,
          'image' as type,
          title,
          originalFilename as name,
          imagePath as path,
          thumbnailPath,
          fileSize,
          mimeType,
          uploadDate,
          updatedAt,
          width,
          height,
          isFavorite
        FROM images
        WHERE userId = ? AND deletedAt IS NULL ${dateFilter}
        
        UNION ALL
        
        SELECT 
          videoId as id,
          'video' as type,
          title,
          originalFilename as name,
          videoPath as path,
          thumbnailPath,
          fileSize,
          mimeType,
          uploadDate,
          updatedAt,
          width,
          height,
          isFavorite
        FROM videos
        WHERE userId = ? AND deletedAt IS NULL ${dateFilter}
      ) AS combined
      ORDER BY updatedAt DESC
      LIMIT ?
    `;

    const [items] = await pool.query<RecentItem[]>(query, [
      userId,
      userId,
      parseInt(limit as string),
    ]);

    // Formatear items
    const formattedItems = items.map((item) => ({
      id: item.id,
      type: item.type,
      name: item.name,
      title: item.title || item.name,
      path: item.path,
      thumbnailPath: item.thumbnailPath,
      size: formatFileSize(item.fileSize),
      sizeBytes: item.fileSize,
      mimeType: item.mimeType,
      uploadedAt: item.uploadDate,
      accessedAt: item.updatedAt,
      dimensions:
        item.width && item.height ? `${item.width}x${item.height}` : null,
      isFavorite: Boolean(item.isFavorite),
    }));

    res.json({
      success: true,
      data: formattedItems,
      count: formattedItems.length,
    });
  } catch (error) {
    console.error("Error fetching recent items:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener elementos recientes",
    });
  }
};

// ============================================================================
// 📊 OBTENER ESTADÍSTICAS DE RECIENTES
// ============================================================================
export const getRecentStats = async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;

  try {
    // Última actividad
    const [lastActivity] = await pool.query<RowDataPacket[]>(
      `
      SELECT MAX(updatedAt) as lastAccess
      FROM (
        SELECT updatedAt FROM images WHERE userId = ? AND deletedAt IS NULL
        UNION ALL
        SELECT updatedAt FROM videos WHERE userId = ? AND deletedAt IS NULL
      ) as combined
    `,
      [userId, userId]
    );

    // Item más reciente
    const [mostRecent] = await pool.query<RowDataPacket[]>(
      `
      SELECT 
        COALESCE(title, originalFilename) as name,
        updatedAt,
        'image' as type
      FROM images
      WHERE userId = ? AND deletedAt IS NULL
      ORDER BY updatedAt DESC
      LIMIT 1
    `,
      [userId]
    );

    // Total de items hoy
    const [todayCount] = await pool.query<RowDataPacket[]>(
      `
      SELECT COUNT(*) as count
      FROM (
        SELECT imageId FROM images 
        WHERE userId = ? AND deletedAt IS NULL AND DATE(uploadDate) = CURDATE()
        UNION ALL
        SELECT videoId FROM videos 
        WHERE userId = ? AND deletedAt IS NULL AND DATE(uploadDate) = CURDATE()
      ) as today
    `,
      [userId, userId]
    );

    // Total de items esta semana
    const [weekCount] = await pool.query<RowDataPacket[]>(
      `
      SELECT COUNT(*) as count
      FROM (
        SELECT imageId FROM images 
        WHERE userId = ? AND deletedAt IS NULL 
        AND uploadDate >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        UNION ALL
        SELECT videoId FROM videos 
        WHERE userId = ? AND deletedAt IS NULL 
        AND uploadDate >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      ) as week
    `,
      [userId, userId]
    );

    // Total de items este mes
    const [monthCount] = await pool.query<RowDataPacket[]>(
      `
      SELECT COUNT(*) as count
      FROM (
        SELECT imageId FROM images 
        WHERE userId = ? AND deletedAt IS NULL 
        AND uploadDate >= DATE_SUB(NOW(), INTERVAL 30 DAY)
        UNION ALL
        SELECT videoId FROM videos 
        WHERE userId = ? AND deletedAt IS NULL 
        AND uploadDate >= DATE_SUB(NOW(), INTERVAL 30 DAY)
      ) as month
    `,
      [userId, userId]
    );

    res.json({
      success: true,
      data: {
        lastActivity: lastActivity[0]?.lastAccess || null,
        mostRecent: mostRecent[0] || null,
        counts: {
          today: todayCount[0]?.count || 0,
          week: weekCount[0]?.count || 0,
          month: monthCount[0]?.count || 0,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching recent stats:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener estadísticas",
    });
  }
};

// ============================================================================
// 🖼️ OBTENER SOLO IMÁGENES RECIENTES
// ============================================================================
export const getRecentImages = async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const { limit = 10 } = req.query;

  try {
    const [images] = await pool.query<RecentItem[]>(
      `
      SELECT 
        imageId as id,
        'image' as type,
        title,
        originalFilename as name,
        imagePath as path,
        thumbnailPath,
        fileSize,
        mimeType,
        uploadDate,
        updatedAt,
        width,
        height,
        isFavorite
      FROM images
      WHERE userId = ? AND deletedAt IS NULL
      ORDER BY updatedAt DESC
      LIMIT ?
    `,
      [userId, parseInt(limit as string)]
    );

    const formattedImages = images.map((img) => ({
      id: img.id,
      type: img.type,
      name: img.name,
      title: img.title || img.name,
      path: img.path,
      thumbnailPath: img.thumbnailPath,
      size: formatFileSize(img.fileSize),
      sizeBytes: img.fileSize,
      mimeType: img.mimeType,
      uploadedAt: img.uploadDate,
      accessedAt: img.updatedAt,
      dimensions: img.width && img.height ? `${img.width}x${img.height}` : null,
      isFavorite: Boolean(img.isFavorite),
    }));

    res.json({
      success: true,
      data: formattedImages,
      count: formattedImages.length,
    });
  } catch (error) {
    console.error("Error fetching recent images:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener imágenes recientes",
    });
  }
};

// ============================================================================
// 🎬 OBTENER SOLO VIDEOS RECIENTES
// ============================================================================
export const getRecentVideos = async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const { limit = 10 } = req.query;

  try {
    const [videos] = await pool.query<RecentItem[]>(
      `
      SELECT 
        videoId as id,
        'video' as type,
        title,
        originalFilename as name,
        videoPath as path,
        thumbnailPath,
        fileSize,
        mimeType,
        uploadDate,
        updatedAt,
        width,
        height,
        isFavorite
      FROM videos
      WHERE userId = ? AND deletedAt IS NULL
      ORDER BY updatedAt DESC
      LIMIT ?
    `,
      [userId, parseInt(limit as string)]
    );

    const formattedVideos = videos.map((vid) => ({
      id: vid.id,
      type: vid.type,
      name: vid.name,
      title: vid.title || vid.name,
      path: vid.path,
      thumbnailPath: vid.thumbnailPath,
      size: formatFileSize(vid.fileSize),
      sizeBytes: vid.fileSize,
      mimeType: vid.mimeType,
      uploadedAt: vid.uploadDate,
      accessedAt: vid.updatedAt,
      dimensions: vid.width && vid.height ? `${vid.width}x${vid.height}` : null,
      isFavorite: Boolean(vid.isFavorite),
    }));

    res.json({
      success: true,
      data: formattedVideos,
      count: formattedVideos.length,
    });
  } catch (error) {
    console.error("Error fetching recent videos:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener videos recientes",
    });
  }
};

// ============================================================================
// 📈 OBTENER LÍNEA DE TIEMPO AGRUPADA POR FECHA
// ============================================================================
export const getTimeline = async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const { days = 30 } = req.query;

  try {
    const query = `
      SELECT 
        DATE(uploadDate) as date,
        COUNT(*) as count,
        SUM(fileSize) as totalSize
      FROM (
        SELECT uploadDate, fileSize FROM images 
        WHERE userId = ? AND deletedAt IS NULL 
        AND uploadDate >= DATE_SUB(NOW(), INTERVAL ? DAY)
        
        UNION ALL
        
        SELECT uploadDate, fileSize FROM videos 
        WHERE userId = ? AND deletedAt IS NULL 
        AND uploadDate >= DATE_SUB(NOW(), INTERVAL ? DAY)
      ) as combined
      GROUP BY DATE(uploadDate)
      ORDER BY date DESC
    `;

    const [timeline] = await pool.query<RowDataPacket[]>(query, [
      userId,
      parseInt(days as string),
      userId,
      parseInt(days as string),
    ]);

    const formattedTimeline = timeline.map((day) => ({
      date: day.date,
      count: day.count,
      totalSize: formatFileSize(day.totalSize),
    }));

    res.json({
      success: true,
      data: formattedTimeline,
    });
  } catch (error) {
    console.error("Error fetching timeline:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener línea de tiempo",
    });
  }
};

// ============================================================================
// 🔥 OBTENER ITEMS MÁS VISTOS/ACCEDIDOS
// ============================================================================
export const getMostViewed = async (req: Request, res: Response) => {
  const userId = (req as any).user.userId;
  const { limit = 10 } = req.query;

  try {
    const query = `
      SELECT * FROM (
        SELECT 
          imageId as id,
          'image' as type,
          COALESCE(title, originalFilename) as name,
          imagePath as path,
          thumbnailPath,
          fileSize,
          updatedAt,
          isFavorite
        FROM images
        WHERE userId = ? AND deletedAt IS NULL
        
        UNION ALL
        
        SELECT 
          videoId as id,
          'video' as type,
          COALESCE(title, originalFilename) as name,
          videoPath as path,
          thumbnailPath,
          fileSize,
          updatedAt,
          isFavorite
        FROM videos
        WHERE userId = ? AND deletedAt IS NULL
      ) AS combined
      ORDER BY updatedAt DESC
      LIMIT ?
    `;

    const [items] = await pool.query<RowDataPacket[]>(query, [
      userId,
      userId,
      parseInt(limit as string),
    ]);

    const formattedItems = items.map((item) => ({
      id: item.id,
      type: item.type,
      name: item.name,
      path: item.path,
      thumbnailPath: item.thumbnailPath,
      size: formatFileSize(item.fileSize),
      lastAccessed: item.updatedAt,
      isFavorite: Boolean(item.isFavorite),
    }));

    res.json({
      success: true,
      data: formattedItems,
    });
  } catch (error) {
    console.error("Error fetching most viewed:", error);
    res.status(500).json({
      success: false,
      message: "Error al obtener items más vistos",
    });
  }
};

// ============================================================================
// 🛠️ HELPER FUNCTIONS
// ============================================================================

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
};