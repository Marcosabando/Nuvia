// src/services/VideoService.ts - VERSIÓN COMPLETA CORREGIDA
import { Request, Response } from "express";
import prisma from '../lib/prisma';
import path from "path";
import fs from "fs/promises";
import ffmpeg from "fluent-ffmpeg";
import type { FfprobeData, FfprobeStream } from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import ffprobeInstaller from "@ffprobe-installer/ffprobe";

ffmpeg.setFfmpegPath(ffmpegInstaller.path);
ffmpeg.setFfprobePath(ffprobeInstaller.path);

// Constants
const ALLOWED_TYPES = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
  "video/x-msvideo",
  "video/x-matroska"
];
const MAX_FILE_SIZE = 2000 * 1024 * 1024; // 2GB

const resolveStoragePath = (storedPath: string | null | undefined): string | null => {
  if (!storedPath) return null;
  if (path.isAbsolute(storedPath)) return storedPath;
  const normalized = storedPath.replace(/^[/\\]+/, '').replace(/\\/g, '/');
  return path.join(process.cwd(), normalized);
};

interface VideoMetadata {
  duration?: number | null;
  width?: number | null;
  height?: number | null;
  fps?: number | null;
  bitrate?: number | null;
  codec?: string | null;
}

const parseFps = (value?: string): number | null => {
  if (!value || value === '0/0') return null;
  const [num, den] = value.split('/').map(part => Number(part));
  if (!den) return Number.isFinite(num) ? num : null;
  const fps = num / den;
  return Number.isFinite(fps) ? Number(fps.toFixed(2)) : null;
};

const extractVideoMetadata = async (filePath: string): Promise<VideoMetadata> => {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(filePath, (error: Error | null, data: FfprobeData) => {
      if (error) {
        console.error('Error obteniendo metadata de video:', error);
        return resolve({});
      }

      const streams = (data.streams ?? []) as FfprobeStream[];
      const videoStream = streams.find((stream) => stream.codec_type === 'video');
      const durationValue = data.format?.duration;
      const duration = typeof durationValue === 'number'
        ? Number(durationValue.toFixed(2))
        : durationValue
          ? Number(Number(durationValue).toFixed(2))
          : null;

      const bitrateValue = data.format?.bit_rate;
      const bitrate = bitrateValue ? Number.parseInt(String(bitrateValue), 10) : null;
      const codec = videoStream?.codec_name ?? null;

      resolve({
        duration: Number.isFinite(duration ?? NaN) ? duration : null,
        width: videoStream?.width ?? null,
        height: videoStream?.height ?? null,
        fps: parseFps(videoStream?.avg_frame_rate ?? videoStream?.r_frame_rate),
        bitrate: Number.isFinite(bitrate ?? NaN) ? bitrate : null,
        codec,
      });
    });
  });
};

const generateVideoThumbnail = async (userId: number, sourcePath: string, filename: string): Promise<string | null> => {
  const uploadsDir = path.join(process.cwd(), 'uploads', userId.toString(), 'videos', 'thumbnails');
  const baseName = path.parse(filename).name;
  const thumbnailFilename = `${baseName}-thumb.jpg`;
  await fs.mkdir(uploadsDir, { recursive: true });

  return new Promise((resolve) => {
    ffmpeg(sourcePath)
      .on('error', (error: Error) => {
        console.error('Error generando thumbnail de video:', error);
        resolve(null);
      })
      .on('end', () => {
        const relative = path.join('uploads', userId.toString(), 'videos', 'thumbnails', thumbnailFilename).replace(/\\/g, '/');
        resolve(relative);
      })
      .screenshots({
        count: 1,
        filename: thumbnailFilename,
        folder: uploadsDir,
        size: '320x?',
      });
  });
};

const validateFile = (file: Express.Multer.File) => {
  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    throw new Error(`Video format not allowed: ${file.mimetype}`);
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`Video too large: ${(file.size / 1024 / 1024).toFixed(2)}MB. Max: 2000MB`);
  }
};

const getRelativePath = (userId: number, filename: string): string => {
  const relative = path.join('uploads', userId.toString(), 'videos', filename);
  return relative.replace(/\\/g, '/');
};

// ✅ Upload single video
export const uploadVideo = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ 
        success: false,
        error: "No video uploaded" 
      });
      return;
    }

    const userId = req.user!.userId;
    const file = req.file;
    validateFile(file);

    const relativePath = getRelativePath(userId, file.filename);
    const absolutePath = file.path;
    const metadata = await extractVideoMetadata(absolutePath);
    
    let thumbnailPath: string | null = null;
    try {
      thumbnailPath = await generateVideoThumbnail(userId, absolutePath, file.filename);
    } catch (thumbnailError) {
      console.warn('No se pudo generar thumbnail para el video:', thumbnailError);
    }

    const video = await prisma.videos.create({
      data: {
        userId: userId,
        title: file.originalname,
        originalFilename: file.originalname,
        filename: file.filename,
        videoPath: relativePath,
        thumbnailPath: thumbnailPath,
        fileSize: BigInt(file.size),
        mimeType: file.mimetype,
        duration: metadata.duration ?? null,
        width: metadata.width ?? null,
        height: metadata.height ?? null,
        fps: metadata.fps ?? null,
        bitrate: metadata.bitrate ?? null,
        codec: metadata.codec ?? null,
      },
    });

    res.status(201).json({
      success: true,
      message: "Video uploaded successfully",
      data: {
        videoId: video.videoId,
        originalname: file.originalname,
        filename: file.filename,
        mimetype: file.mimetype,
        size: file.size,
        duration: metadata.duration ?? null,
        width: metadata.width ?? null,
        height: metadata.height ?? null,
        fps: metadata.fps ?? null,
        bitrate: metadata.bitrate ?? null,
        codec: metadata.codec ?? null,
        url: `/${relativePath}`,
        thumbnail: thumbnailPath ? `/${thumbnailPath}` : null,
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
  try {
    if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
      res.status(400).json({ 
        success: false,
        error: "No videos uploaded" 
      });
      return;
    }

    const userId = req.user!.userId;
    const files = req.files as Express.Multer.File[];
    const insertedVideos = [];

    for (const file of files) {
      validateFile(file);
      const relativePath = getRelativePath(userId, file.filename);
      const absolutePath = file.path;
      const metadata = await extractVideoMetadata(absolutePath);

      let thumbnailPath: string | null = null;
      try {
        thumbnailPath = await generateVideoThumbnail(userId, absolutePath, file.filename);
      } catch (thumbnailError) {
        console.warn('No se pudo generar thumbnail para el video:', thumbnailError);
      }

      const video = await prisma.videos.create({
        data: {
          userId: userId,
          title: file.originalname,
          originalFilename: file.originalname,
          filename: file.filename,
          videoPath: relativePath,
          thumbnailPath: thumbnailPath,
          fileSize: BigInt(file.size),
          mimeType: file.mimetype,
          duration: metadata.duration ?? null,
          width: metadata.width ?? null,
          height: metadata.height ?? null,
          fps: metadata.fps ?? null,
          bitrate: metadata.bitrate ?? null,
          codec: metadata.codec ?? null,
        },
      });

      insertedVideos.push({
        videoId: video.videoId,
        originalname: file.originalname,
        filename: file.filename,
        mimetype: file.mimetype,
        size: file.size,
        duration: metadata.duration ?? null,
        width: metadata.width ?? null,
        height: metadata.height ?? null,
        fps: metadata.fps ?? null,
        bitrate: metadata.bitrate ?? null,
        codec: metadata.codec ?? null,
        url: `/${relativePath}`,
        thumbnail: thumbnailPath ? `/${thumbnailPath}` : null,
      });
    }

    res.status(201).json({
      success: true,
      message: "Videos uploaded successfully",
      data: insertedVideos,
    });
  } catch (error) {
    console.error("Error uploading multiple videos:", error);
    res.status(500).json({ 
      success: false,
      error: "Error uploading videos", 
      details: (error as Error).message 
    });
  }
};

// ✅ Get all user videos
export const getUserVideos = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const favoritesOnly = req.query.favorites === 'true';

    const where: any = {
      userId: userId,
      deletedAt: { equals: null },
    };

    if (favoritesOnly) where.isFavorite = true;

    const [videos, total] = await Promise.all([
      prisma.videos.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.videos.count({ where }),
    ]);

    const formattedVideos = videos.map(video => ({
      ...video,
      fileSize: video.fileSize ? video.fileSize.toString() : "0",
    }));

    res.json({
      success: true,
      data: formattedVideos,
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

export const getVideosByUser = async (req: Request, res: Response): Promise<void> => {
  try {
    const requestedUserId = parseInt(req.params.userId);

    if (Number.isNaN(requestedUserId)) {
      res.status(400).json({
        success: false,
        error: "Invalid user id"
      });
      return;
    }

    const authenticatedUserId = req.user!.userId;

    if (requestedUserId !== authenticatedUserId) {
      res.status(403).json({
        success: false,
        error: "Not authorized to view videos for this user"
      });
      return;
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const favoritesOnly = req.query.favorites === 'true';

    const where: any = {
      userId: requestedUserId,
      deletedAt: { equals: null },
    };

    if (favoritesOnly) {
      where.isFavorite = true;
    }

    const [videos, total] = await Promise.all([
      prisma.videos.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.videos.count({ where }),
    ]);

    const formattedVideos = videos.map(video => ({
      ...video,
      fileSize: video.fileSize ? video.fileSize.toString() : "0",
    }));

    res.json({
      success: true,
      data: formattedVideos,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Error getting videos by user:", error);
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

    const video = await prisma.videos.findFirst({
      where: {
        videoId: videoId,
        userId: userId,
        deletedAt: { equals: null },
      },
    });

    if (!video) {
      res.status(404).json({ 
        success: false,
        error: "Video not found" 
      });
      return;
    }

    const formattedVideo = {
      ...video,
      fileSize: video.fileSize ? video.fileSize.toString() : "0",
    };

    res.json({
      success: true,
      data: formattedVideo,
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

    const video = await prisma.videos.findFirst({
      where: {
        videoId: videoId,
        userId: userId,
      },
    });

    if (!video) {
      res.status(404).json({ 
        success: false,
        error: "Video not found" 
      });
      return;
    }

    const videoPath = video.videoPath;
    const thumbnailPath = video.thumbnailPath;

    await prisma.videos.delete({
      where: {
        videoId: videoId,
      },
    });

    const absoluteVideoPath = resolveStoragePath(videoPath);
    if (absoluteVideoPath) {
      try {
        await fs.unlink(absoluteVideoPath);
      } catch (fsError) {
        console.error("Error deleting video file:", fsError);
      }
    }

    if (thumbnailPath) {
      const absoluteThumbnailPath = resolveStoragePath(thumbnailPath);
      if (absoluteThumbnailPath) {
        try {
          await fs.unlink(absoluteThumbnailPath);
        } catch (fsError) {
          console.error("Error deleting thumbnail file:", fsError);
        }
      }
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

// ✅ Soft delete (move to trash) - VERSIÓN CORREGIDA
export const softDeleteVideo = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const videoId = parseInt(req.params.id);

    const video = await prisma.videos.findFirst({
      where: {
        videoId: videoId,
        userId: userId,
        deletedAt: { equals: null },
      },
    });

    if (!video) {
      res.status(404).json({ 
        success: false,
        error: "Video not found" 
      });
      return;
    }

    const permanentDeleteAt = new Date();
    permanentDeleteAt.setDate(permanentDeleteAt.getDate() + 30);

    let fullPath = video.videoPath;
    if (!fullPath.startsWith("uploads/")) {
      fullPath = `uploads/${fullPath}`;
    }

    if (!fullPath.includes("/videos/")) {
      const parts = fullPath.split("/");
      if (parts.length >= 3) {
        parts.splice(2, 0, "videos");
        fullPath = parts.join("/");
      }
    }

    const metadata = {
      width: video.width,
      height: video.height,
      duration: video.duration,
      title: video.title,
      fps: video.fps,
      bitrate: video.bitrate,
      codec: video.codec
    };

    // ✅ TRANSACCIÓN CORREGIDA
    await prisma.$transaction(async (tx) => {
      await tx.videos.update({
        where: { videoId: videoId },
        data: { deletedAt: new Date() },
      });

      await tx.trash.create({
        data: {
          userId: userId,
          itemType: 'video',
          itemId: videoId,
          originalName: video.originalFilename || video.filename,
          originalPath: fullPath,
          fileSize: video.fileSize || 0n,
          mimeType: video.mimeType,
          metadata: JSON.stringify(metadata),
          deletedAt: new Date(),
          permanentDeleteAt: permanentDeleteAt,
        },
      });
    });

    res.json({
      success: true,
      message: "Video moved to trash",
      data: { videoId }
    });
  } catch (error) {
    console.error("Error moving video to trash:", error);
    res.status(500).json({ 
      success: false,
      error: "Error moving video to trash",
      details: (error as Error).message 
    });
  }
};

// ✅ Restore video from trash
export const restoreVideo = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const videoId = parseInt(req.params.id);

    const video = await prisma.videos.updateMany({
      where: {
        videoId: videoId,
        userId: userId,
        deletedAt: { not: { equals: null } },
      },
      data: {
        deletedAt: null,
      },
    });

    if (video.count === 0) {
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
    const skip = (page - 1) * limit;

    const [videos, total] = await Promise.all([
      prisma.videos.findMany({
        where: {
          userId: userId,
          deletedAt: { not: { equals: null } },
        },
        skip,
        take: limit,
        orderBy: {
          deletedAt: 'desc',
        },
      }),
      prisma.videos.count({
        where: {
          userId: userId,
          deletedAt: { not: { equals: null } },
        },
      }),
    ]);

    const formattedVideos = videos.map(video => ({
      ...video,
      fileSize: video.fileSize ? video.fileSize.toString() : "0",
    }));

    res.json({
      success: true,
      data: formattedVideos,
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

    const video = await prisma.videos.updateMany({
      where: {
        videoId: videoId,
        userId: userId,
        deletedAt: { equals: null },
      },
      data: {
        title: title.trim(),
      },
    });

    if (video.count === 0) {
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

    const video = await prisma.videos.updateMany({
      where: {
        videoId: videoId,
        userId: userId,
        deletedAt: { equals: null },
      },
      data: {
        description: description || null,
      },
    });

    if (video.count === 0) {
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

    const updateData: any = {};
    if (duration !== undefined) updateData.duration = duration;
    if (width !== undefined) updateData.width = width;
    if (height !== undefined) updateData.height = height;
    if (fps !== undefined) updateData.fps = fps;
    if (bitrate !== undefined) updateData.bitrate = bitrate;
    if (codec !== undefined) updateData.codec = codec;

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({ 
        success: false,
        error: "No metadata provided to update" 
      });
      return;
    }

    const video = await prisma.videos.updateMany({
      where: {
        videoId: videoId,
        userId: userId,
        deletedAt: { equals: null },
      },
      data: updateData,
    });

    if (video.count === 0) {
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

    const video = await prisma.videos.findFirst({
      where: {
        videoId: videoId,
        userId: userId,
        deletedAt: { equals: null },
      },
    });

    if (!video) {
      res.status(404).json({ 
        success: false,
        error: "Video not found" 
      });
      return;
    }

    const newFavorite = !video.isFavorite;

    await prisma.videos.update({
      where: { videoId: videoId },
      data: { isFavorite: newFavorite },
    });

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
    const skip = (page - 1) * limit;

    if (!searchTerm || searchTerm.trim() === "") {
      res.status(400).json({ 
        success: false,
        error: "Search term required" 
      });
      return;
    }

    const where = {
      userId: userId,
      deletedAt: { equals: null },
      OR: [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { description: { contains: searchTerm, mode: 'insensitive' } },
        { originalFilename: { contains: searchTerm, mode: 'insensitive' } },
      ],
    };

    const [videos, total] = await Promise.all([
      prisma.videos.findMany({
        where,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.videos.count({ where }),
    ]);

    const formattedVideos = videos.map(video => ({
      ...video,
      fileSize: video.fileSize ? video.fileSize.toString() : "0",
    }));

    res.json({
      success: true,
      data: formattedVideos,
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

    const videos = await prisma.videos.findMany({
      where: {
        userId: userId,
      },
    });

    let totalVideos = 0;
    let favoriteVideos = 0;
    let deletedVideos = 0;
    let totalSize = 0;
    let activeSize = 0;
    let totalDuration = 0;
    let lastUpload: Date | null = null;

    for (const video of videos) {
      totalVideos++;
      if (video.isFavorite) favoriteVideos++;
      if (video.deletedAt) deletedVideos++;
      totalSize += Number(video.fileSize);
      if (!video.deletedAt) activeSize += Number(video.fileSize);
      if (video.duration) totalDuration += video.duration;
      if (video.createdAt && (!lastUpload || video.createdAt > lastUpload)) {
        lastUpload = video.createdAt;
      }
    }

    const avgDuration = totalVideos > 0 ? totalDuration / totalVideos : 0;

    res.json({
      success: true,
      data: {
        totalVideos,
        favoriteVideos,
        deletedVideos,
        totalSize,
        activeSize,
        totalSizeMB: (totalSize / 1024 / 1024).toFixed(2),
        activeSizeMB: (activeSize / 1024 / 1024).toFixed(2),
        totalDuration,
        avgDuration,
        lastUpload,
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

    const videos = await prisma.videos.findMany({
      where: {
        userId: userId,
        deletedAt: { equals: null },
      },
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
    });

    const formattedVideos = videos.map(video => ({
      ...video,
      fileSize: video.fileSize ? video.fileSize.toString() : "0",
    }));

    res.json({
      success: true,
      data: formattedVideos,
    });
  } catch (error) {
    console.error("Error getting recent videos:", error);
    res.status(500).json({ 
      success: false,
      error: "Error getting recent videos" 
    });
  }
};