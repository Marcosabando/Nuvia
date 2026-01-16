// src/services/images.service.ts
import { Request, Response } from "express";
import prisma from "../lib/prisma";
import path from "path";
import fs from "fs/promises";
import sharp from "sharp";

// ============================================================================
// CONSTANTS
// ============================================================================
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 3GB

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

const validateFile = (file: Express.Multer.File) => {
  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    throw new Error(`Format not allowed: ${file.mimetype}`);
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`File too large: ${formatFileSize(file.size)}`);
  }
};

const getImageDimensions = async (filePath: string): Promise<{ width: number; height: number }> => {
  try {
    await fs.access(filePath);
    const metadata = await sharp(filePath).metadata();

    if (!metadata.width || !metadata.height) {
      return { width: 0, height: 0 };
    }

    return {
      width: metadata.width,
      height: metadata.height,
    };
  } catch (error) {
    return { width: 0, height: 0 };
  }
};

const getRelativePath = (userId: number, filename: string, subfolder: string = "images"): string => {
  return path.join("uploads", userId.toString(), subfolder, filename).replace(/\\/g, "/");
};

// ============================================================================
// 📤 UPLOAD IMAGES
// ============================================================================
export const uploadImage = async (req: Request, res: Response): Promise<void> => {
  let fileProcessed = false;

  try {
    if (!req.file) {
      res.status(400).json({
        success: false,
        error: "No image uploaded",
      });
      return;
    }

    const userId = req.user!.userId;
    const file = req.file;

    validateFile(file);

    const relativePath = getRelativePath(userId, file.filename, "images");
    const { title, description } = req.body;

    const dimensions = await getImageDimensions(file.path);

    const image = await prisma.images.create({
      data: {
        userId: userId,
        title: title || file.originalname,
        description: description || null,
        originalFilename: file.originalname,
        filename: file.filename,
        imagePath: relativePath,
        fileSize: file.size,
        mimeType: file.mimetype,
        width: dimensions.width,
        height: dimensions.height,
        isFavorite: false,
        isPublic: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    fileProcessed = true;

    res.status(201).json({
      success: true,
      message: "Image uploaded successfully",
      data: {
        imageId: image.imageId,
        title: image.title,
        originalname: file.originalname,
        filename: file.filename,
        mimetype: file.mimetype,
        size: file.size,
        width: dimensions.width,
        height: dimensions.height,
        url: `/${relativePath}`,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Error uploading image",
      details: (error as Error).message,
    });
  } finally {
    if (!fileProcessed && req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {}
    }
  }
};

export const uploadMultipleImages = async (req: Request, res: Response): Promise<void> => {
  const filesToCleanup: string[] = [];

  try {
    if (!req.files || (req.files as Express.Multer.File[]).length === 0) {
      res.status(400).json({
        success: false,
        error: "No images uploaded",
      });
      return;
    }

    const userId = req.user!.userId;
    const files = req.files as Express.Multer.File[];
    const insertedImages = [];

    for (const file of files) {
      filesToCleanup.push(file.path);

      validateFile(file);

      const relativePath = getRelativePath(userId, file.filename, "images");
      const dimensions = await getImageDimensions(file.path);

      const image = await prisma.images.create({
        data: {
          userId: userId,
          title: file.originalname,
          originalFilename: file.originalname,
          filename: file.filename,
          imagePath: relativePath,
          fileSize: file.size,
          mimeType: file.mimetype,
          width: dimensions.width,
          height: dimensions.height,
          isFavorite: false,
          isPublic: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      insertedImages.push({
        imageId: image.imageId,
        originalname: file.originalname,
        filename: file.filename,
        mimetype: file.mimetype,
        size: file.size,
        width: dimensions.width,
        height: dimensions.height,
        url: `/${relativePath}`,
      });

      const index = filesToCleanup.indexOf(file.path);
      if (index > -1) {
        filesToCleanup.splice(index, 1);
      }
    }

    res.status(201).json({
      success: true,
      message: `${insertedImages.length} images uploaded successfully`,
      data: insertedImages,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Error uploading images",
      details: (error as Error).message,
    });
  } finally {
    if (filesToCleanup.length > 0) {
      for (const filePath of filesToCleanup) {
        try {
          await fs.unlink(filePath);
        } catch (cleanupError) {}
      }
    }
  }
};

// ============================================================================
// 📋 GET IMAGES - VERSIÓN CORREGIDA
// ============================================================================
export const getUserImages = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const favoritesOnly = req.query.favorites === "true";
    const searchQuery = req.query.search as string;

    const where: any = {
      userId: userId,
      deletedAt: { equals: null },
    };

    if (favoritesOnly) {
      where.isFavorite = true;
    }

    if (searchQuery && searchQuery.trim() !== "") {
      where.OR = [
        { title: { contains: searchQuery, mode: "insensitive" } },
        { description: { contains: searchQuery, mode: "insensitive" } },
        { originalFilename: { contains: searchQuery, mode: "insensitive" } },
      ];
    }

    const [images, total] = await Promise.all([
      prisma.images.findMany({
        where,
        select: {
          imageId: true,
          userId: true,
          title: true,
          description: true,
          originalFilename: true,
          filename: true,
          imagePath: true,
          thumbnailPath: true,
          mediumPath: true,
          fileSize: true,
          mimeType: true,
          width: true,
          height: true,
          isFavorite: true,
          isPublic: true,
          location: true,
          takenDate: true,
          cameraInfo: true,
          deletedAt: true,
          createdAt: true,
          updatedAt: true,
          yearMonth: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.images.count({ where }),
    ]);

    const imagesWithSerializedFileSize = images.map((image) => ({
      ...image,
      fileSize: image.fileSize ? Number(image.fileSize) : 0,
    }));

    res.json({
      success: true,
      data: imagesWithSerializedFileSize,
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
      error: "Error obteniendo imágenes",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

export const getImageById = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const imageId = parseInt(req.params.id);

    if (!userId || !imageId) {
      res.status(400).json({
        success: false,
        error: "ID de imagen requerido",
      });
      return;
    }

    const image = await prisma.images.findFirst({
      where: {
        imageId: imageId,
        userId: userId,
        deletedAt: { equals: null },
      },
      select: {
        imageId: true,
        userId: true,
        title: true,
        description: true,
        originalFilename: true,
        filename: true,
        imagePath: true,
        thumbnailPath: true,
        mediumPath: true,
        fileSize: true,
        mimeType: true,
        width: true,
        height: true,
        isFavorite: true,
        isPublic: true,
        location: true,
        takenDate: true,
        cameraInfo: true,
        deletedAt: true,
        createdAt: true,
        updatedAt: true,
        yearMonth: true,
      },
    });

    if (!image) {
      res.status(404).json({
        success: false,
        error: "Imagen no encontrada",
      });
      return;
    }

    const imageWithSerializedFileSize = {
      ...image,
      fileSize: image.fileSize ? Number(image.fileSize) : 0,
    };

    res.json({
      success: true,
      data: imageWithSerializedFileSize,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Error obteniendo imagen",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

export const getRecentImages = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const limit = parseInt(req.query.limit as string) || 10;

    const images = await prisma.images.findMany({
      where: {
        userId: userId,
        deletedAt: { equals: null },
      },
      select: {
        imageId: true,
        title: true,
        imagePath: true,
        thumbnailPath: true,
        mimeType: true,
        fileSize: true,
        isFavorite: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });

    const imagesWithSerializedFileSize = images.map((image) => ({
      ...image,
      fileSize: image.fileSize ? Number(image.fileSize) : 0,
    }));

    res.json({
      success: true,
      data: imagesWithSerializedFileSize,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Error obteniendo imágenes recientes",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

export const searchImages = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const searchQuery = req.query.q as string;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    if (!searchQuery || searchQuery.trim() === "") {
      res.status(400).json({
        success: false,
        error: "Término de búsqueda requerido",
      });
      return;
    }

    const where = {
      userId: userId,
      deletedAt: { equals: null },
      OR: [
        { title: { contains: searchQuery, mode: "insensitive" } },
        { description: { contains: searchQuery, mode: "insensitive" } },
        { originalFilename: { contains: searchQuery, mode: "insensitive" } },
      ],
    };

    const [images, total] = await Promise.all([
      prisma.images.findMany({
        where,
        select: {
          imageId: true,
          title: true,
          description: true,
          imagePath: true,
          thumbnailPath: true,
          mimeType: true,
          fileSize: true,
          isFavorite: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.images.count({ where }),
    ]);

    const imagesWithSerializedFileSize = images.map((image) => ({
      ...image,
      fileSize: image.fileSize ? Number(image.fileSize) : 0,
    }));

    res.json({
      success: true,
      data: imagesWithSerializedFileSize,
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
      error: "Error buscando imágenes",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

// ============================================================================
// ✏️ UPDATE IMAGES
// ============================================================================
export const updateImageTitle = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const imageId = parseInt(req.params.id);
    const { title } = req.body;

    if (!title || title.trim() === "") {
      res.status(400).json({
        success: false,
        error: "El título no puede estar vacío",
      });
      return;
    }

    const existing = await prisma.images.findFirst({
      where: {
        imageId: imageId,
        userId: userId,
        deletedAt: null,
      },
    });

    if (!existing) {
      res.status(404).json({
        success: false,
        error: "Imagen no encontrada",
      });
      return;
    }

    await prisma.images.update({
      where: {
        imageId: imageId,
      },
      data: {
        title: title.trim(),
        updatedAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: "Título actualizado correctamente",
      data: { title: title.trim() },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Error actualizando título",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

export const updateImageDescription = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const imageId = parseInt(req.params.id);
    const { description } = req.body;

    const existing = await prisma.images.findFirst({
      where: {
        imageId: imageId,
        userId: userId,
        deletedAt: null,
      },
    });

    if (!existing) {
      res.status(404).json({
        success: false,
        error: "Imagen no encontrada",
      });
      return;
    }

    await prisma.images.update({
      where: {
        imageId: imageId,
      },
      data: {
        description: description || null,
        updatedAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: "Descripción actualizada correctamente",
      data: { description },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Error actualizando descripción",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

export const updateImageMetadata = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const imageId = parseInt(req.params.id);
    const { width, height, location, takenDate, cameraInfo } = req.body;

    const existing = await prisma.images.findFirst({
      where: {
        imageId: imageId,
        userId: userId,
        deletedAt: null,
      },
    });

    if (!existing) {
      res.status(404).json({
        success: false,
        error: "Imagen no encontrada",
      });
      return;
    }

    const updates: any = {
      updatedAt: new Date(),
    };

    if (width !== undefined) updates.width = parseInt(width);
    if (height !== undefined) updates.height = parseInt(height);
    if (location !== undefined) updates.location = location;
    if (takenDate !== undefined) updates.takenDate = new Date(takenDate);
    if (cameraInfo !== undefined) updates.cameraInfo = cameraInfo;

    if (Object.keys(updates).length === 0) {
      res.status(400).json({
        success: false,
        error: "No hay campos para actualizar",
      });
      return;
    }

    const image = await prisma.images.update({
      where: {
        imageId: imageId,
      },
      data: updates,
    });

    res.json({
      success: true,
      message: "Metadatos actualizados correctamente",
      data: image,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Error actualizando metadatos",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

// ============================================================================
// ⭐ FAVORITES
// ============================================================================
export const toggleImageFavorite = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const imageId = parseInt(req.params.id);

    const existing = await prisma.images.findFirst({
      where: {
        imageId: imageId,
        userId: userId,
        deletedAt: null,
      },
    });

    if (!existing) {
      res.status(404).json({
        success: false,
        error: "Imagen no encontrada",
      });
      return;
    }

    const newFavoriteStatus = !existing.isFavorite;

    await prisma.images.update({
      where: {
        imageId: imageId,
      },
      data: {
        isFavorite: newFavoriteStatus,
        updatedAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: newFavoriteStatus ? "Añadido a favoritos" : "Eliminado de favoritos",
      data: {
        isFavorite: newFavoriteStatus,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Error cambiando estado de favorito",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

// ============================================================================
// 🔓 PUBLIC/PRIVATE
// ============================================================================
export const toggleImagePublic = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const imageId = parseInt(req.params.id);

    const existing = await prisma.images.findFirst({
      where: {
        imageId: imageId,
        userId: userId,
        deletedAt: null,
      },
    });

    if (!existing) {
      res.status(404).json({
        success: false,
        error: "Imagen no encontrada",
      });
      return;
    }

    const newPublicStatus = !existing.isPublic;

    await prisma.images.update({
      where: {
        imageId: imageId,
      },
      data: {
        isPublic: newPublicStatus,
        updatedAt: new Date(),
      },
    });

    res.json({
      success: true,
      message: newPublicStatus ? "Imagen ahora es pública" : "Imagen ahora es privada",
      data: {
        isPublic: newPublicStatus,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Error cambiando visibilidad",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

// ============================================================================
// 📊 STATISTICS
// ============================================================================
export const getImageStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const [totalImages, activeImages, totalFavorites, totalPublic, totalDeleted, totalSizeResult] = await Promise.all([
      prisma.images.count({
        where: { userId },
      }),
      prisma.images.count({
        where: { userId, deletedAt: null },
      }),
      prisma.images.count({
        where: { userId, isFavorite: true, deletedAt: null },
      }),
      prisma.images.count({
        where: { userId, isPublic: true, deletedAt: null },
      }),
      prisma.images.count({
        where: { userId, NOT: { deletedAt: null } },
      }),
      prisma.images.aggregate({
        where: { userId, deletedAt: null },
        _sum: { fileSize: true },
      }),
    ]);

    const totalSize = totalSizeResult._sum.fileSize ? Number(totalSizeResult._sum.fileSize) : 0;

    res.json({
      success: true,
      data: {
        totalImages,
        activeImages,
        totalSize,
        totalSizeFormatted: (totalSize / (1024 * 1024)).toFixed(2) + " MB",
        totalFavorites,
        totalPublic,
        totalDeleted,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Error obteniendo estadísticas",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

// ============================================================================
// ❌ DELETE IMAGES
// ============================================================================
export const moveToTrash = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.userId;

  try {
    const image = await prisma.images.findFirst({
      where: {
        imageId: parseInt(id),
        userId: userId,
        deletedAt: null,
      },
    });

    if (!image) {
      return res.status(404).json({
        success: false,
        message: "Imagen no encontrada",
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.trash.create({
        data: {
          userId: image.userId,
          itemType: "image",
          itemId: image.imageId,
          originalName: image.originalFilename,
          originalPath: image.imagePath,
          fileSize: image.fileSize,
          mimeType: image.mimeType,
          metadata: JSON.stringify({
            width: image.width,
            height: image.height,
            title: image.title,
            filename: image.filename,
            fileSize: Number(image.fileSize),
          }),
          createdAt: new Date(),
        },
      });

      await tx.images.update({
        where: { imageId: image.imageId },
        data: {
          deletedAt: new Date(),
          updatedAt: new Date(),
        },
      });
    });

    res.json({
      success: true,
      message: "🗑️ Imagen movida a la papelera correctamente",
      imageId: id,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

export const getDeletedImages = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const deletedImages = await prisma.images.findMany({
      where: {
        userId: userId,
        NOT: { deletedAt: null },
      },
      select: {
        imageId: true,
        title: true,
        originalFilename: true,
        imagePath: true,
        fileSize: true,
        deletedAt: true,
      },
      orderBy: {
        deletedAt: "desc",
      },
    });

    const deletedImagesWithSerializedFileSize = deletedImages.map((image) => ({
      ...image,
      fileSize: image.fileSize ? Number(image.fileSize) : 0,
    }));

    res.json({
      success: true,
      data: deletedImagesWithSerializedFileSize,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Error obteniendo imágenes eliminadas",
    });
  }
};

export const restoreImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const imageId = parseInt(req.params.id);

    const image = await prisma.images.findFirst({
      where: {
        imageId: imageId,
        userId: userId,
        NOT: { deletedAt: null },
      },
    });

    if (!image) {
      res.status(404).json({
        success: false,
        error: "Imagen no encontrada en la papelera",
      });
      return;
    }

    await prisma.images.update({
      where: { imageId: imageId },
      data: {
        deletedAt: null,
        updatedAt: new Date(),
      },
    });

    await prisma.trash.deleteMany({
      where: {
        userId: userId,
        itemType: "image",
        itemId: imageId,
      },
    });

    res.json({
      success: true,
      message: "Imagen restaurada correctamente",
      data: { imageId },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Error restaurando imagen",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};