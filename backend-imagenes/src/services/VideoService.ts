// src/services/VideoService.ts
import { Request, Response } from "express";
import { pool } from "@src/config/database";
import { RowDataPacket, ResultSetHeader } from "mysql2";
import path from "path";
import fs from "fs/promises";

// Constantes
const ALLOWED_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime", // .mov
  "video/x-msvideo", // .avi
  "video/x-matroska" // .mkv
];
const MAX_FILE_SIZE = 2000 * 1024 * 1024; // 2GB

// ✅ Función auxiliar para validar archivo
const validateFile = (file: Express.Multer.File) => {
  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    throw new Error(`Formato de video no permitido: ${file.mimetype}`);
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`Video muy grande: ${(file.size / 1024 / 1024).toFixed(2)}MB. Máximo: 2000MB`);
  }
};

// ✅ Función auxiliar para crear ruta relativa
const getRelativePath = (userId: number, filename: string): string => {
  return path.join("uploads", "videos", userId.toString(), filename).replace(/\\/g, '/');
};

// ✅ Subir video individual
export const uploadVideo = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: "No se subió ningún video" });
      return;
    }

    const userId = req.user!.userId;
    const file = req.file;

    // Validar archivo
    validateFile(file);

    const relativePath = getRelativePath(userId, file.filename);

    // Insertar en BD
    const [result] = await pool.query<ResultSetHeader>(
      `INSERT INTO videos 
      (user_id, title, original_filename, filename, video_path, file_size, mime_type) 
      VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, file.originalname, file.originalname, file.filename, relativePath, file.size, file.mimetype]
    );

    res.status(201).json({
      success: true,
      message: "Video subido con éxito",
      data: {
        id: result.insertId,
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
      error: "Error al subir el video",
      details: (error as Error).message 
    });
  }
};

// ✅ Subir múltiples videos
export const uploadMultipleVideos = async (req: Request, res: Response): Promise<void> => {
  const connection = await pool.getConnection();
  try {
    if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
      res.status(400).json({ error: "No se subieron videos" });
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
         (user_id, title, original_filename, filename, video_path, file_size, mime_type)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [userId, file.originalname, file.originalname, file.filename, relativePath, file.size, file.mimetype]
      );

      insertedVideos.push({
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
      message: "Videos subidos con éxito",
      data: insertedVideos,
    });
  } catch (error) {
    await connection.rollback();
    console.error("Error uploading multiple videos:", error);
    res.status(500).json({ 
      success: false,
      error: "Error al subir los videos", 
      details: (error as Error).message 
    });
  } finally {
    connection.release();
  }
};

// ✅ Obtener todos los videos del usuario
export const getUserVideos = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;
    const favoritesOnly = req.query.favorites === 'true';

    let query = `SELECT id, user_id as userId, title, description, original_filename as originalFilename, 
              filename, video_path as videoPath, file_size as fileSize, 
              mime_type as mimeType, duration, width, height, fps, bitrate, codec,
              is_favorite as isFavorite, is_public as isPublic, 
              upload_date as uploadDate, recorded_date as recordedDate, 
              location, created_at as created
       FROM videos 
       WHERE user_id = ? AND deleted_at IS NULL`;
    
    const queryParams: any[] = [userId];

    if (favoritesOnly) {
      query += ` AND is_favorite = 1`;
    }

    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    queryParams.push(limit, offset);

    const [videos] = await pool.query<RowDataPacket[]>(query, queryParams);

    let countQuery = `SELECT COUNT(*) as total FROM videos WHERE user_id = ? AND deleted_at IS NULL`;
    const countParams: any[] = [userId];

    if (favoritesOnly) {
      countQuery += ` AND is_favorite = 1`;
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
      error: "Error al obtener los videos" 
    });
  }
};

// ✅ Obtener video por ID
export const getVideoById = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const videoId = parseInt(req.params.id);

    const [videos] = await pool.query<RowDataPacket[]>(
      `SELECT id, user_id as userId, title, description, original_filename as originalFilename, 
              filename, video_path as videoPath, file_size as fileSize, 
              mime_type as mimeType, duration, width, height, fps, bitrate, codec,
              is_favorite as isFavorite, is_public as isPublic,
              upload_date as uploadDate, recorded_date as recordedDate,
              location, created_at as created 
       FROM videos 
       WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      [videoId, userId]
    );

    if (videos.length === 0) {
      res.status(404).json({ 
        success: false,
        error: "Video no encontrado" 
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
      error: "Error al obtener el video" 
    });
  }
};

// ✅ Eliminar video (hard delete)
export const deleteVideo = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const videoId = parseInt(req.params.id);

    // Obtener info del video
    const [videos] = await pool.query<RowDataPacket[]>(
      `SELECT video_path as videoPath FROM videos WHERE id = ? AND user_id = ?`,
      [videoId, userId]
    );

    if (videos.length === 0) {
      res.status(404).json({ 
        success: false,
        error: "Video no encontrado" 
      });
      return;
    }

    const videoPath = videos[0].videoPath;

    // Eliminar de BD
    await pool.query(
      `DELETE FROM videos WHERE id = ? AND user_id = ?`,
      [videoId, userId]
    );

    // Eliminar archivo físico
    try {
      await fs.unlink(videoPath);
    } catch (fsError) {
      console.error("Error deleting file:", fsError);
      // No fallar si el archivo no existe
    }

    res.json({
      success: true,
      message: "Video eliminado con éxito",
    });
  } catch (error) {
    console.error("Error deleting video:", error);
    res.status(500).json({ 
      success: false,
      error: "Error al eliminar el video" 
    });
  }
};

// ✅ Soft delete (mover a papelera)
export const softDeleteVideo = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const videoId = parseInt(req.params.id);

    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE videos SET deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      [videoId, userId]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ 
        success: false,
        error: "Video no encontrado" 
      });
      return;
    }

    res.json({
      success: true,
      message: "Video movido a la papelera",
    });
  } catch (error) {
    console.error("Error soft deleting video:", error);
    res.status(500).json({ 
      success: false,
      error: "Error al mover el video a la papelera" 
    });
  }
};

// ✅ Restaurar video de la papelera
export const restoreVideo = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const videoId = parseInt(req.params.id);

    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE videos SET deleted_at = NULL WHERE id = ? AND user_id = ? AND deleted_at IS NOT NULL`,
      [videoId, userId]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ 
        success: false,
        error: "Video no encontrado en la papelera" 
      });
      return;
    }

    res.json({
      success: true,
      message: "Video restaurado con éxito",
    });
  } catch (error) {
    console.error("Error restoring video:", error);
    res.status(500).json({ 
      success: false,
      error: "Error al restaurar el video" 
    });
  }
};

// ✅ Obtener videos eliminados (papelera)
export const getDeletedVideos = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const [videos] = await pool.query<RowDataPacket[]>(
      `SELECT id, user_id as userId, title, description, original_filename as originalFilename, 
              filename, video_path as videoPath, file_size as fileSize, 
              mime_type as mimeType, duration, deleted_at as deletedAt, created_at as created
       FROM videos 
       WHERE user_id = ? AND deleted_at IS NOT NULL
       ORDER BY deleted_at DESC
       LIMIT ? OFFSET ?`,
      [userId, limit, offset]
    );

    const [countResult] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM videos WHERE user_id = ? AND deleted_at IS NOT NULL`,
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
      error: "Error al obtener videos eliminados" 
    });
  }
};

// ✅ Actualizar título del video
export const updateVideoTitle = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const videoId = parseInt(req.params.id);
    const { title } = req.body;

    if (!title || title.trim() === "") {
      res.status(400).json({ 
        success: false,
        error: "El título no puede estar vacío" 
      });
      return;
    }

    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE videos SET title = ? WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      [title.trim(), videoId, userId]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ 
        success: false,
        error: "Video no encontrado" 
      });
      return;
    }

    res.json({
      success: true,
      message: "Título actualizado con éxito",
    });
  } catch (error) {
    console.error("Error updating video title:", error);
    res.status(500).json({ 
      success: false,
      error: "Error al actualizar el título" 
    });
  }
};

// ✅ Actualizar descripción del video
export const updateVideoDescription = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const videoId = parseInt(req.params.id);
    const { description } = req.body;

    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE videos SET description = ? WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      [description || null, videoId, userId]
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ 
        success: false,
        error: "Video no encontrado" 
      });
      return;
    }

    res.json({
      success: true,
      message: "Descripción actualizada con éxito",
    });
  } catch (error) {
    console.error("Error updating video description:", error);
    res.status(500).json({ 
      success: false,
      error: "Error al actualizar la descripción" 
    });
  }
};

// ✅ Actualizar metadatos del video (duración, resolución, fps, etc.)
export const updateVideoMetadata = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const videoId = parseInt(req.params.id);
    const { duration, width, height, fps, bitrate, codec } = req.body;

    // Construir query dinámicamente solo con campos presentes
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
        error: "No se proporcionaron metadatos para actualizar" 
      });
      return;
    }

    values.push(videoId, userId);

    const [result] = await pool.query<ResultSetHeader>(
      `UPDATE videos SET ${updates.join(', ')} WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      values
    );

    if (result.affectedRows === 0) {
      res.status(404).json({ 
        success: false,
        error: "Video no encontrado" 
      });
      return;
    }

    res.json({
      success: true,
      message: "Metadatos actualizados con éxito",
    });
  } catch (error) {
    console.error("Error updating video metadata:", error);
    res.status(500).json({ 
      success: false,
      error: "Error al actualizar los metadatos" 
    });
  }
};

// ✅ Marcar/desmarcar video como favorito
export const toggleVideoFavorite = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const videoId = parseInt(req.params.id);

    // Verificar que el video existe y obtener estado actual
    const [videos] = await pool.query<RowDataPacket[]>(
      `SELECT is_favorite as isFavorite FROM videos WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
      [videoId, userId]
    );

    if (videos.length === 0) {
      res.status(404).json({ 
        success: false,
        error: "Video no encontrado" 
      });
      return;
    }

    const currentFavorite = videos[0].isFavorite;
    const newFavorite = !currentFavorite;

    // Actualizar estado
    await pool.query<ResultSetHeader>(
      `UPDATE videos SET is_favorite = ? WHERE id = ? AND user_id = ?`,
      [newFavorite, videoId, userId]
    );

    res.json({
      success: true,
      message: newFavorite ? "Video añadido a favoritos" : "Video eliminado de favoritos",
      data: {
        isFavorite: newFavorite
      }
    });
  } catch (error) {
    console.error("Error toggling video favorite:", error);
    res.status(500).json({ 
      success: false,
      error: "Error al actualizar favorito" 
    });
  }
};

// ✅ Buscar videos
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
        error: "Término de búsqueda requerido" 
      });
      return;
    }

    const searchPattern = `%${searchTerm}%`;

    const [videos] = await pool.query<RowDataPacket[]>(
      `SELECT id, user_id as userId, title, description, original_filename as originalFilename, 
              filename, video_path as videoPath, file_size as fileSize, 
              mime_type as mimeType, duration, is_favorite as isFavorite, created_at as created
       FROM videos 
       WHERE user_id = ? AND deleted_at IS NULL 
       AND (title LIKE ? OR description LIKE ? OR original_filename LIKE ?)
       ORDER BY created_at DESC
       LIMIT ? OFFSET ?`,
      [userId, searchPattern, searchPattern, searchPattern, limit, offset]
    );

    const [countResult] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM videos 
       WHERE user_id = ? AND deleted_at IS NULL 
       AND (title LIKE ? OR description LIKE ? OR original_filename LIKE ?)`,
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
      error: "Error al buscar videos" 
    });
  }
};

// ✅ Obtener estadísticas de videos del usuario
export const getVideoStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const [stats] = await pool.query<RowDataPacket[]>(
      `SELECT 
        COUNT(*) as totalVideos,
        COUNT(CASE WHEN is_favorite = 1 THEN 1 END) as favoriteVideos,
        COUNT(CASE WHEN deleted_at IS NOT NULL THEN 1 END) as deletedVideos,
        SUM(file_size) as totalSize,
        SUM(CASE WHEN deleted_at IS NULL THEN file_size ELSE 0 END) as activeSize,
        SUM(duration) as totalDuration,
        AVG(duration) as avgDuration,
        MAX(created_at) as lastUpload
       FROM videos 
       WHERE user_id = ?`,
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
      error: "Error al obtener estadísticas" 
    });
  }
};

// ✅ Obtener videos recientes
export const getRecentVideos = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const limit = parseInt(req.query.limit as string) || 10;

    const [videos] = await pool.query<RowDataPacket[]>(
      `SELECT id, user_id as userId, title, original_filename as originalFilename, 
              filename, video_path as videoPath, file_size as fileSize, 
              mime_type as mimeType, duration, is_favorite as isFavorite, created_at as created
       FROM videos 
       WHERE user_id = ? AND deleted_at IS NULL
       ORDER BY created_at DESC
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
      error: "Error al obtener videos recientes" 
    });
  }
};
