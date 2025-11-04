// src/services/VideoService.ts
import { Request, Response } from "express";
import { pool } from "@src/config/database";
import { RowDataPacket, ResultSetHeader } from "mysql2";
import path from "path";
import fs from "fs/promises";

// Constants
const ALLOWED_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime", // .mov
  "video/x-msvideo", // .avi
  "video/x-matroska" // .mkv
];
const MAX_FILE_SIZE = 2000 * 1024 * 1024; // 2GB

// ✅ Helper function to validate file
const validateFile = (file: Express.Multer.File) => {
  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    throw new Error(`Video format not allowed: ${file.mimetype}`);
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`Video too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Max: 2000MB`);
  }
};

// ✅ Helper function to create relative path
const getRelativePath = (userId: number, filename: string): string => {
  return path.join("uploads", "videos", userId.toString(), filename).replace(/\\/g, '/');
};

// ✅ Upload single video
export const uploadVideo = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No video uploaded" });
      return;
    }

    const userId = req.user!.userId;
    const file = req.file;

    // Validate file
    validateFile(file);

    const relativePath = getRelativePath(userId, file.filename);

    // Insert into DB
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO videos 
      (userId, title, originalFilename, filename, videoPath, fileSize, mimeType) 
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, file.originalname, file.originalname, file.filename, relativePath, file.size, file.mimetype]
    );

    res.status(201).json({
      success: true,
      message: "Video uploaded successfully",
      data: {
        videoId: result.insertId,
        originalname: file.originalname,
        filename: file.filename,
        mimetype: file.mimetype,
        size: file.size,
        url: `/${relativePath}`,
      },
    });
  } catch (error) {
    console.error("Error uploading video:", error);
    res.status(500).json({ 
      success: false,
      error: "Error uploading video",
      details: (error as Error).message 
    });
  }
};

// ✅ Upload multiple videos
export const uploadMultipleVideos = async (req: Request, res: Response): Promise<void> => {
  const connection = await pool.getConnection();
  try {
    if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
      res.status(400).json({ error: "No videos uploaded" });
      return;
    }

    const userId = req.user!.userId;
    const files = req.files as Express.Multer.File[];
    const insertedVideos = [];

    await connection.beginTransaction();

    for (const file of files) {
      validateFile(file);

      const relativePath = getRelativePath(userId, file.filename);

      const [result] = await connection.query<ResultSetHeader>(
        `INSERT INTO videos 
         (userId, title, originalFilename, filename, videoPath, fileSize, mimeType)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, file.originalname, file.originalname, file.filename, relativePath, file.size, file.mimetype]
      );

      insertedVideos.push({
        videoId: result.insertId,
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
      message: "Videos uploaded successfully",
      data: insertedVideos,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error uploading multiple videos:", error);
    res.status(500).json({ 
      success: false,
      error: "Error uploading videos", 
      details: (error as Error).message 
    });
  } finally {
    connection.release();
  }
};

// ✅ Get all user videos
export const getUserVideos = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const favoritesOnly = req.query.favorites === 'true';

    let query = `SELECT videoId, userId, title, description, originalFilename, 
              filename, videoPath, fileSize, 
              mimeType, duration, width, height, fps, bitrate, codec,
              isFavorite, isPublic, 
              uploadDate, recordedDate, 
              location, createdAt
       FROM videos 
       WHERE userId = ? AND deletedAt IS NULL`;
    
    const queryParams: any[] = [userId];

    if (favoritesOnly) {
      query += ` AND isFavorite = 1`;
    }

    query += ` ORDER BY createdAt DESC LIMIT ? OFFSET ?`;
    queryParams.push(limit, offset);

    const [videos] = await pool.query<RowDataPacket[]>(query, queryParams);

    let countQuery = `SELECT COUNT(*) as total FROM videos WHERE userId = ? AND deletedAt IS NULL`;
    const countParams: any[] = [userId];

    if (favoritesOnly) {
      countQuery += ` AND isFavorite = 1`;
    }

    const [countResult] = await pool.query<RowDataPacket[]>(countQuery, countParams);

    const total = countResult[0].total;

    res.json({
      success: true,
      data: videos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error getting user videos:", error);
    res.status(500).json({ 
      success: false,
      error: "Error getting videos" 
    });
  }
};

// ✅ Get video by ID
export const getVideoById = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const videoId = parseInt(req.params.id);

    const [videos] = await pool.query<RowDataPacket[]>(
      `SELECT videoId, userId, title, description, originalFilename, 
              filename, videoPath, fileSize, 
              mimeType, duration, width, height, fps, bitrate, codec,
              isFavorite, isPublic,
              uploadDate, recordedDate,
              location, createdAt 
       FROM videos 
       WHERE videoId = ? AND userId = ? AND deletedAt IS NULL`,
      [videoId, userId]
    );

    if (videos.length === 0) {
      res.status(404).json({ 
        success: false,
        error: "Video not found" 
      });
      return;
    }

    res.json({
      success: true,
      data: videos[0],
    });
  } catch (error) {
    console.error("Error getting video:", error);
    res.status(500).json({ 
      success: false,
      error: "Error getting video" 
    });
  }
};

// ✅ Delete video (hard delete)
export const deleteVideo = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const videoId = parseInt(req.params.id);

    // Get video info
    const [videos] = await pool.query<RowDataPacket[]>(
      `SELECT videoPath FROM videos WHERE videoId = ? AND userId = ?`,
      [videoId, userId]
    );

    if (videos.length === 0) {
      res.status(404).json({ 
        success: false,
        error: "Video not found" 
      });
      return;
    }

    const videoPath = videos[0].videoPath;

    // Delete from DB
    await pool.query(
      `DELETE FROM videos WHERE videoId = ? AND userId = ?`,
      [videoId, userId]
    );

    // Delete physical file
    try {
      await fs.unlink(videoPath);
    } catch (fsError) {
      console.error("Error deleting file:", fsError);
      // Don't fail if file doesn't exist
    }

    res.json({
      success: true,
      message: "Video deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting video:", error);
    res.status(500).json({ 
      success: false,
      error: "Error deleting video" 
    });
  }
};

// ✅ Soft delete (move to trash)
export const softDeleteVideo = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const videoId = parseInt(req.params.id);

    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE videos SET deletedAt = CURRENT_TIMESTAMP WHERE videoId = ? AND userId = ? AND deletedAt IS NULL`,
      [videoId, userId]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ 
        success: false,
        error: "Video not found" 
      });
      return;
    }

    res.json({
      success: true,
      message: "Video moved to trash",
    });
  } catch (error) {
    console.error("Error soft deleting video:", error);
    res.status(500).json({ 
      success: false,
      error: "Error moving video to trash" 
    });
  }
};

// ✅ Restore video from trash
export const restoreVideo = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const videoId = parseInt(req.params.id);

    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE videos SET deletedAt = NULL WHERE videoId = ? AND userId = ? AND deletedAt IS NOT NULL`,
      [videoId, userId]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ 
        success: false,
        error: "Video not found in trash" 
      });
      return;
    }

    res.json({
      success: true,
      message: "Video restored successfully",
    });
  } catch (error) {
    console.error("Error restoring video:", error);
    res.status(500).json({ 
      success: false,
      error: "Error restoring video" 
    });
  }
};

// ✅ Get deleted videos (trash)
export const getDeletedVideos = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const [videos] = await pool.query<RowDataPacket[]>(
      `SELECT videoId, userId, title, description, originalFilename, 
              filename, videoPath, fileSize, 
              mimeType, duration, deletedAt, createdAt
       FROM videos 
       WHERE userId = ? AND deletedAt IS NOT NULL
       ORDER BY deletedAt DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    const [countResult] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM videos WHERE userId = ? AND deletedAt IS NOT NULL`,
      [userId]
    );

    const total = countResult[0].total;

    res.json({
      success: true,
      data: videos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error getting deleted videos:", error);
    res.status(500).json({ 
      success: false,
      error: "Error getting deleted videos" 
    });
  }
};

// ✅ Update video title
export const updateVideoTitle = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const videoId = parseInt(req.params.id);
    const { title } = req.body;

    if (!title || title.trim() === "") {
      res.status(400).json({ 
        success: false,
        error: "Title cannot be empty" 
      });
      return;
    }

    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE videos SET title = ? WHERE videoId = ? AND userId = ? AND deletedAt IS NULL`,
      [title.trim(), videoId, userId]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ 
        success: false,
        error: "Video not found" 
      });
      return;
    }

    res.json({
      success: true,
      message: "Title updated successfully",
    });
  } catch (error) {
    console.error("Error updating video title:", error);
    res.status(500).json({ 
      success: false,
      error: "Error updating title" 
    });
  }
};

// ✅ Update video description
export const updateVideoDescription = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const videoId = parseInt(req.params.id);
    const { description } = req.body;

    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE videos SET description = ? WHERE videoId = ? AND userId = ? AND deletedAt IS NULL`,
      [description || null, videoId, userId]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ 
        success: false,
        error: "Video not found" 
      });
      return;
    }

    res.json({
      success: true,
      message: "Description updated successfully",
    });
  } catch (error) {
    console.error("Error updating video description:", error);
    res.status(500).json({ 
      success: false,
      error: "Error updating description" 
    });
  }
};

// ✅ Update video metadata (duration, resolution, fps, etc.)
export const updateVideoMetadata = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const videoId = parseInt(req.params.id);
    const { duration, width, height, fps, bitrate, codec } = req.body;

    // Build query dynamically only with present fields
    const updates: string[] = [];
    const values: any[] = [];

    if (duration !== undefined) {
      updates.push('duration = ?');
      values.push(duration);
    }
    if (width !== undefined) {
      updates.push('width = ?');
      values.push(width);
    }
    if (height !== undefined) {
      updates.push('height = ?');
      values.push(height);
    }
    if (fps !== undefined) {
      updates.push('fps = ?');
      values.push(fps);
    }
    if (bitrate !== undefined) {
      updates.push('bitrate = ?');
      values.push(bitrate);
    }
    if (codec !== undefined) {
      updates.push('codec = ?');
      values.push(codec);
    }

    if (updates.length === 0) {
      res.status(400).json({ 
        success: false,
        error: "No metadata provided to update" 
      });
      return;
    }

    values.push(videoId, userId);

    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE videos SET ${updates.join(', ')} WHERE videoId = ? AND userId = ? AND deletedAt IS NULL`,
      values
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ 
        success: false,
        error: "Video not found" 
      });
      return;
    }

    res.json({
      success: true,
      message: "Metadata updated successfully",
    });
  } catch (error) {
    console.error("Error updating video metadata:", error);
    res.status(500).json({ 
      success: false,
      error: "Error updating metadata" 
    });
  }
};

// ✅ Mark/unmark video as favorite
export const toggleVideoFavorite = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const videoId = parseInt(req.params.id);

    // Verify video exists and get current state
    const [videos] = await pool.query<RowDataPacket[]>(
      `SELECT isFavorite FROM videos WHERE videoId = ? AND userId = ? AND deletedAt IS NULL`,
      [videoId, userId]
    );

    if (videos.length === 0) {
      res.status(404).json({ 
        success: false,
        error: "Video not found" 
      });
      return;
    }

    const currentFavorite = videos[0].isFavorite;
    const newFavorite = !currentFavorite;

    // Update state
    await pool.query<ResultSetHeader>(
      `UPDATE videos SET isFavorite = ? WHERE videoId = ? AND userId = ?`,
      [newFavorite, videoId, userId]
    );

    res.json({
      success: true,
      message: newFavorite ? "Video added to favorites" : "Video removed from favorites",
      data: {
        isFavorite: newFavorite
      }
    });
  } catch (error) {
    console.error("Error toggling video favorite:", error);
    res.status(500).json({ 
      success: false,
      error: "Error updating favorite" 
    });
  }
};

// ✅ Search videos
export const searchVideos = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const searchTerm = req.query.q as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    if (!searchTerm || searchTerm.trim() === "") {
      res.status(400).json({ 
        success: false,
        error: "Search term required" 
      });
      return;
    }

    const searchPattern = `%${searchTerm}%`;

    const [videos] = await pool.query<RowDataPacket[]>(
      `SELECT videoId, userId, title, description, originalFilename, 
              filename, videoPath, fileSize, 
              mimeType, duration, isFavorite, createdAt
       FROM videos 
       WHERE userId = ? AND deletedAt IS NULL 
       AND (title LIKE ? OR description LIKE ? OR originalFilename LIKE ?)
       ORDER BY createdAt DESC
       LIMIT ? OFFSET ?`,
      [userId, searchPattern, searchPattern, searchPattern, limit, offset]
    );

    const [countResult] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM videos 
       WHERE userId = ? AND deletedAt IS NULL 
       AND (title LIKE ? OR description LIKE ? OR originalFilename LIKE ?)`,
      [userId, searchPattern, searchPattern, searchPattern]
    );

    const total = countResult[0].total;

    res.json({
      success: true,
      data: videos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error searching videos:", error);
    res.status(500).json({ 
      success: false,
      error: "Error searching videos" 
    });
  }
};

// ✅ Get user video statistics
export const getVideoStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const [stats] = await pool.query<RowDataPacket[]>(
      `SELECT 
        COUNT(*) as totalVideos,
        COUNT(CASE WHEN isFavorite = 1 THEN 1 END) as favoriteVideos,
        COUNT(CASE WHEN deletedAt IS NOT NULL THEN 1 END) as deletedVideos,
        SUM(fileSize) as totalSize,
        SUM(CASE WHEN deletedAt IS NULL THEN fileSize ELSE 0 END) as activeSize,
        SUM(duration) as totalDuration,
        AVG(duration) as avgDuration,
        MAX(createdAt) as lastUpload
       FROM videos 
       WHERE userId = ?`,
      [userId]
    );

    res.json({
      success: true,
      data: {
        totalVideos: stats[0].totalVideos || 0,
        favoriteVideos: stats[0].favoriteVideos || 0,
        deletedVideos: stats[0].deletedVideos || 0,
        totalSize: stats[0].totalSize || 0,
        activeSize: stats[0].activeSize || 0,
        totalSizeMB: ((stats[0].totalSize || 0) / 1024 / 1024).toFixed(2),
        activeSizeMB: ((stats[0].activeSize || 0) / 1024 / 1024).toFixed(2),
        totalDuration: stats[0].totalDuration || 0,
        avgDuration: stats[0].avgDuration || 0,
        lastUpload: stats[0].lastUpload,
      },
    });
  } catch (error) {
    console.error("Error getting video stats:", error);
    res.status(500).json({ 
      success: false,
      error: "Error getting statistics" 
    });
  }
};

// ✅ Get recent videos
export const getRecentVideos = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const limit = parseInt(req.query.limit as string) || 10;

    const [videos] = await pool.query<RowDataPacket[]>(
      `SELECT videoId, userId, title, originalFilename, 
              filename, videoPath, fileSize, 
              mimeType, duration, isFavorite, createdAt
       FROM videos 
       WHERE userId = ? AND deletedAt IS NULL
       ORDER BY createdAt DESC
       LIMIT ?`,
      [userId, limit]
    );

    res.json({
      success: true,
      data: videos,
    });
  } catch (error) {
    console.error("Error getting recent videos:", error);
    res.status(500).json({ 
      success: false,
      error: "Error getting recent videos" 
    });
  }
};