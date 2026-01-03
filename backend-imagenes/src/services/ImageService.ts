// src/services/images.service.ts
import { Request, Response } from "express";
import prisma from "../lib/prisma"; // ✅ Instancia única
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
    throw new Error(`File too large: ${formatFileSize(file.size)}`); // Usa tu función formatFileSize
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
    console.error("Error getting image dimensions:", error);
    return { width: 0, height: 0 };
  }
};

const getRelativePath = (userId: number, filename: string, subfolder: string = "images"): string => {
  return path.join("uploads", userId.toString(), subfolder, filename).replace(/\\/g, "/");
};

// ============================================================================
// 📤 UPLOAD IMAGES
// ============================================================================

/**
 * Upload single image
 * POST /api/images/upload
 */
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

    // Get image dimensions
    const dimensions = await getImageDimensions(file.path);

    // ✅ USAR INSTANCIA ÚNICA DE PRISMA
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
    console.error("Error uploading image:", error);
    res.status(500).json({
      success: false,
      error: "Error uploading image",
      details: (error as Error).message,
    });
  } finally {
    // Clean temp file if needed
    if (!fileProcessed && req.file) {
      try {
        await fs.unlink(req.file.path);
      } catch (cleanupError) {
        console.error("Error cleaning temp file:", cleanupError);
      }
    }
  }
};

/**
 * Upload multiple images
 * POST /api/images/upload-multiple
 */
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
      // Save path for cleanup in case of error
      filesToCleanup.push(file.path);

      validateFile(file);

      const relativePath = getRelativePath(userId, file.filename, "images");

      // Get dimensions for each image
      const dimensions = await getImageDimensions(file.path);

      // ✅ USAR INSTANCIA ÚNICA DE PRISMA
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

      // Remove from cleanup list since processed correctly
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
    console.error("Error uploading multiple images:", error);
    res.status(500).json({
      success: false,
      error: "Error uploading images",
      details: (error as Error).message,
    });
  } finally {
    // Clean temp files in case of error
    if (filesToCleanup.length > 0) {
      for (const filePath of filesToCleanup) {
        try {
          await fs.unlink(filePath);
        } catch (cleanupError) {
          console.error(`Error cleaning ${filePath}:`, cleanupError);
        }
      }
    }
  }
};

// ============================================================================
// 📋 GET IMAGES - VERSIÓN CORREGIDA
// ============================================================================

/**
 * Get all user images (active)
 * GET /api/images
 */
export const getUserImages = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;
    const favoritesOnly = req.query.favorites === "true";
    const searchQuery = req.query.search as string;

    // Build where clause
    const where: any = {
      userId: userId,
      deletedAt: { equals: null }, // Cambiado a equals: null
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

    console.log("🔍 Buscando imágenes con where clause:", JSON.stringify(where, null, 2));

    // ✅ USAR INSTANCIA ÚNICA DE PRISMA
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

    console.log(`✅ Encontradas ${images.length} imágenes de ${total} totales`);

    // Convertir BigInt a Number para fileSize
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
    console.error("❌ Error obteniendo imágenes del usuario:", error);
    res.status(500).json({
      success: false,
      error: "Error obteniendo imágenes",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

/**
 * Get image by ID
 * GET /api/images/:id
 */
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

    // ✅ USAR INSTANCIA ÚNICA DE PRISMA
    const image = await prisma.images.findFirst({
      where: {
        imageId: imageId,
        userId: userId,
        deletedAt: { equals: null }, // Cambiado aquí también
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

    // Convertir BigInt a Number
    const imageWithSerializedFileSize = {
      ...image,
      fileSize: image.fileSize ? Number(image.fileSize) : 0,
    };

    res.json({
      success: true,
      data: imageWithSerializedFileSize,
    });
  } catch (error) {
    console.error("❌ Error obteniendo imagen:", error);
    res.status(500).json({
      success: false,
      error: "Error obteniendo imagen",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

/**
 * Get recent images (last 10)
 * GET /api/images/recent
 */
export const getRecentImages = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const limit = parseInt(req.query.limit as string) || 10;

    // ✅ USAR INSTANCIA ÚNICA DE PRISMA
    const images = await prisma.images.findMany({
      where: {
        userId: userId,
        deletedAt: { equals: null }, // Cambiado aquí
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

    // Convertir BigInt a Number
    const imagesWithSerializedFileSize = images.map((image) => ({
      ...image,
      fileSize: image.fileSize ? Number(image.fileSize) : 0,
    }));

    res.json({
      success: true,
      data: imagesWithSerializedFileSize,
    });
  } catch (error) {
    console.error("❌ Error obteniendo imágenes recientes:", error);
    res.status(500).json({
      success: false,
      error: "Error obteniendo imágenes recientes",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

/**
 * Search images
 * GET /api/images/search?q=query
 */
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
      deletedAt: { equals: null }, // Cambiado aquí
      OR: [
        { title: { contains: searchQuery, mode: "insensitive" } },
        { description: { contains: searchQuery, mode: "insensitive" } },
        { originalFilename: { contains: searchQuery, mode: "insensitive" } },
      ],
    };

    // ✅ USAR INSTANCIA ÚNICA DE PRISMA
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

    // Convertir BigInt a Number
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
    console.error("❌ Error buscando imágenes:", error);
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

/**
 * Update image title
 * PATCH /api/images/:id/title
 */
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

    // Verificar que la imagen existe
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

    // ✅ USAR INSTANCIA ÚNICA DE PRISMA
    const image = await prisma.images.update({
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
    console.error("❌ Error actualizando título de imagen:", error);
    res.status(500).json({
      success: false,
      error: "Error actualizando título",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

/**
 * Update image description
 * PATCH /api/images/:id/description
 */
export const updateImageDescription = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const imageId = parseInt(req.params.id);
    const { description } = req.body;

    // Verificar que la imagen existe
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

    // ✅ USAR INSTANCIA ÚNICA DE PRISMA
    const image = await prisma.images.update({
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
    console.error("❌ Error actualizando descripción de imagen:", error);
    res.status(500).json({
      success: false,
      error: "Error actualizando descripción",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};

/**
 * Update image metadata
 * PATCH /api/images/:id/metadata
 */
export const updateImageMetadata = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const imageId = parseInt(req.params.id);
    const { width, height, location, takenDate, cameraInfo } = req.body;

    // Verificar que la imagen existe
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

    // ✅ USAR INSTANCIA ÚNICA DE PRISMA
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
    console.error("❌ Error actualizando metadatos de imagen:", error);
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

/**
 * Toggle favorite
 * POST /api/images/:id/favorite
 */
export const toggleImageFavorite = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const imageId = parseInt(req.params.id);

    // Verificar que la imagen existe
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

    // ✅ USAR INSTANCIA ÚNICA DE PRISMA
    const updated = await prisma.images.update({
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
    console.error("❌ Error cambiando favorito:", error);
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

/**
 * Toggle public/private
 * POST /api/images/:id/toggle-public
 */
export const toggleImagePublic = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const imageId = parseInt(req.params.id);

    // Verificar que la imagen existe
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

    // ✅ USAR INSTANCIA ÚNICA DE PRISMA
    const updated = await prisma.images.update({
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
    console.error("❌ Error cambiando visibilidad:", error);
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

/**
 * Get user image statistics
 * GET /api/images/stats
 */
export const getImageStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    // ✅ USAR INSTANCIA ÚNICA DE PRISMA
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
    console.error("❌ Error obteniendo estadísticas de imágenes:", error);
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

/**
 * Soft delete image (move to trash)
 * DELETE /api/images/:id/trash
 */
export const moveToTrash = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.userId;

  try {
    // 1️⃣ Find the image
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

    console.log("📸 Moviendo imagen a la papelera:", {
      imageId: image.imageId,
      title: image.title,
      path: image.imagePath,
    });

    // 2️⃣ Insert into trash with Prisma transaction
    await prisma.$transaction(async (tx) => {
      // Insert into trash
      await tx.trash.create({
        data: {
          userId: image.userId,
          itemType: "image",
          itemId: image.imageId,
          originalName: image.originalFilename,
          originalPath: image.imagePath,
          fileSize: image.fileSize, // Esto es BigInt, pero Prisma lo maneja si la base de datos lo soporta. Sin embargo, para JSON.stringify en metadata, convertimos a número.
          mimeType: image.mimeType,
          metadata: JSON.stringify({
            width: image.width,
            height: image.height,
            title: image.title,
            filename: image.filename,
            fileSize: Number(image.fileSize), // Convertimos a número
          }),
          createdAt: new Date(),
        },
      });

      // Soft delete image
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
    console.error("❌ Error moviendo imagen a la papelera:", error);
    res.status(500).json({
      success: false,
      message: "Error interno del servidor",
      error: error instanceof Error ? error.message : String(error),
    });
  }
};

/**
 * Get deleted images
 * GET /api/images/deleted
 */
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

    // Convertir BigInt a Number
    const deletedImagesWithSerializedFileSize = deletedImages.map((image) => ({
      ...image,
      fileSize: image.fileSize ? Number(image.fileSize) : 0,
    }));

    res.json({
      success: true,
      data: deletedImagesWithSerializedFileSize,
    });
  } catch (error) {
    console.error("❌ Error obteniendo imágenes eliminadas:", error);
    res.status(500).json({
      success: false,
      error: "Error obteniendo imágenes eliminadas",
    });
  }
};

/**
 * Restore image from trash
 * POST /api/images/:id/restore
 */
export const restoreImage = async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;
    const imageId = parseInt(req.params.id);

    // Verificar que la imagen existe y está eliminada
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

    // Restaurar imagen
    await prisma.images.update({
      where: { imageId: imageId },
      data: {
        deletedAt: null,
        updatedAt: new Date(),
      },
    });

    // Eliminar de la tabla trash
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
    console.error("❌ Error restaurando imagen:", error);
    res.status(500).json({
      success: false,
      error: "Error restaurando imagen",
      details: error instanceof Error ? error.message : String(error),
    });
  }
};
