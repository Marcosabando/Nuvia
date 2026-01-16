// src/services/folder.service.ts
import { Request, Response } from "express";
import prisma from '../lib/prisma';

// ============================================================================
// 📋 OBTENER TODAS LAS CARPETAS DEL USUARIO
// ============================================================================
export const getUserFolders = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Usuario no autenticado"
      });
    }

    const folders = await prisma.folders.findMany({
      where: { 
        userId: userId,
        deletedAt: null
      },
      select: {
        folderId: true,
        userId: true,
        name: true,
        description: true,
        parentFolderId: true,
        color: true,
        isSystem: true,
        sortOrder: true,
        itemCount: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: [
        { isSystem: 'desc' },
        { sortOrder: 'asc' },
        { name: 'asc' }
      ]
    });

    return res.json({
      success: true,
      data: folders,
      count: folders.length
    });

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: "Error al obtener las carpetas"
    });
  }
};

// ============================================================================
// 🆕 CREAR NUEVA CARPETA
// ============================================================================
export const createFolder = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { name, description, parentFolderId, color } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Usuario no autenticado"
      });
    }

    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "El nombre de la carpeta es requerido"
      });
    }

    const existing = await prisma.folders.findFirst({
      where: {
        userId: userId,
        name: name.trim(),
        deletedAt: null
      }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: "Ya existe una carpeta con ese nombre"
      });
    }

    const lastFolder = await prisma.folders.findFirst({
      where: { userId: userId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true }
    });
    
    const nextOrder = (lastFolder?.sortOrder || 0) + 1;

    const newFolder = await prisma.folders.create({
      data: {
        userId: userId,
        name: name.trim(),
        description: description || null,
        parentFolderId: parentFolderId || null,
        color: color || '#6c757d',
        sortOrder: nextOrder,
        isSystem: false,
        itemCount: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    return res.status(201).json({
      success: true,
      data: newFolder,
      message: "Carpeta creada exitosamente"
    });

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: "Error al crear la carpeta"
    });
  }
};

// ============================================================================
// 📁 OBTENER CARPETA POR ID
// ============================================================================
export const getFolderById = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const folderId = parseInt(req.params.id);

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Usuario no autenticado"
      });
    }

    const folder = await prisma.folders.findFirst({
      where: {
        folderId: folderId,
        userId: userId,
        deletedAt: null
      }
    });

    if (!folder) {
      return res.status(404).json({
        success: false,
        error: "Carpeta no encontrada"
      });
    }

    return res.json({
      success: true,
      data: folder
    });

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: "Error al obtener la carpeta"
    });
  }
};

// ============================================================================
// ✏️ ACTUALIZAR CARPETA
// ============================================================================
export const updateFolder = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const folderId = parseInt(req.params.id);
    const { name, description, color, sortOrder } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Usuario no autenticado"
      });
    }

    const folder = await prisma.folders.findFirst({
      where: {
        folderId: folderId,
        userId: userId,
        deletedAt: null
      },
      select: {
        isSystem: true
      }
    });

    if (!folder) {
      return res.status(404).json({
        success: false,
        error: "Carpeta no encontrada"
      });
    }

    if (folder.isSystem) {
      return res.status(403).json({
        success: false,
        error: "No se pueden editar carpetas del sistema"
      });
    }

    const updateData: any = {
      updatedAt: new Date()
    };

    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description || null;
    if (color !== undefined) updateData.color = color;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        error: "No hay datos para actualizar"
      });
    }

    const updated = await prisma.folders.update({
      where: { folderId: folderId },
      data: updateData
    });

    return res.json({
      success: true,
      data: updated,
      message: "Carpeta actualizada exitosamente"
    });

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: "Error al actualizar la carpeta"
    });
  }
};

// ============================================================================
// 🗑️ ELIMINAR CARPETA (SOFT DELETE)
// ============================================================================
export const deleteFolder = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const folderId = parseInt(req.params.id);

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Usuario no autenticado"
      });
    }

    const folder = await prisma.folders.findFirst({
      where: {
        folderId: folderId,
        userId: userId,
        deletedAt: null
      },
      select: {
        isSystem: true,
        itemCount: true
      }
    });

    if (!folder) {
      return res.status(404).json({
        success: false,
        error: "Carpeta no encontrada"
      });
    }

    if (folder.isSystem) {
      return res.status(403).json({
        success: false,
        error: "No se pueden eliminar carpetas del sistema"
      });
    }

    if (folder.itemCount && folder.itemCount > 0) {
      return res.status(400).json({
        success: false,
        error: `La carpeta contiene ${folder.itemCount} elementos. Vacía la carpeta antes de eliminarla.`
      });
    }

    await prisma.folders.update({
      where: { folderId: folderId },
      data: { deletedAt: new Date() }
    });

    return res.json({
      success: true,
      message: "Carpeta eliminada exitosamente"
    });

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: "Error al eliminar la carpeta"
    });
  }
};

// ============================================================================
// 📊 OBTENER CONTENIDO DE UNA CARPETA
// ============================================================================
export const getFolderContent = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const folderId = parseInt(req.params.id);

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Usuario no autenticado"
      });
    }

    const folder = await prisma.folders.findFirst({
      where: {
        folderId: folderId,
        userId: userId,
        deletedAt: null
      }
    });

    if (!folder) {
      return res.status(404).json({
        success: false,
        error: "Carpeta no encontrada"
      });
    }

    const folderImages = await prisma.folder_images.findMany({
      where: { folderId: folderId },
      include: {
        images: {
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
            uploadDate: true,
            takenDate: true,
            cameraInfo: true,
            location: true,
            deletedAt: true,
            createdAt: true,
            updatedAt: true,
            yearMonth: true
          }
        }
      },
      orderBy: { sortOrder: 'asc' }
    });

    const folderVideos = await prisma.folder_videos.findMany({
      where: { folderId: folderId },
      include: {
        videos: {
          select: {
            videoId: true,
            userId: true,
            title: true,
            description: true,
            originalFilename: true,
            filename: true,
            videoPath: true,
            thumbnailPath: true,
            fileSize: true,
            mimeType: true,
            duration: true,
            width: true,
            height: true,
            fps: true,
            bitrate: true,
            codec: true,
            isFavorite: true,
            isPublic: true,
            uploadDate: true,
            recordedDate: true,
            cameraInfo: true,
            location: true,
            deletedAt: true,
            createdAt: true,
            updatedAt: true,
            yearMonth: true
          }
        }
      },
      orderBy: { sortOrder: 'asc' }
    });

    const images = folderImages
      .filter(fi => fi.images && fi.images.deletedAt === null)
      .map(fi => ({
        ...fi.images,
        sortOrder: fi.sortOrder || 0
      }));

    const videos = folderVideos
      .filter(fv => fv.videos && fv.videos.deletedAt === null)
      .map(fv => ({
        ...fv.videos,
        sortOrder: fv.sortOrder || 0
      }));

    return res.json({
      success: true,
      data: {
        folder: folder,
        images: images,
        videos: videos,
        totalItems: images.length + videos.length
      }
    });

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: "Error al obtener el contenido de la carpeta"
    });
  }
};

// ============================================================================
// ➕ AÑADIR IMAGEN A CARPETA
// ============================================================================
export const addImageToFolder = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const folderId = parseInt(req.params.id);
    const { imageId } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Usuario no autenticado"
      });
    }

    const folder = await prisma.folders.findFirst({
      where: {
        folderId: folderId,
        userId: userId,
        deletedAt: null
      }
    });

    if (!folder) {
      return res.status(404).json({
        success: false,
        error: "Carpeta no encontrada"
      });
    }

    const image = await prisma.images.findFirst({
      where: {
        imageId: imageId,
        userId: userId,
        deletedAt: null
      }
    });

    if (!image) {
      return res.status(404).json({
        success: false,
        error: "Imagen no encontrada"
      });
    }

    const existing = await prisma.folder_images.findFirst({
      where: {
        folderId: folderId,
        imageId: imageId
      }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: "La imagen ya está en esta carpeta"
      });
    }

    const lastItem = await prisma.folder_images.findFirst({
      where: { folderId: folderId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true }
    });
    
    const nextOrder = (lastItem?.sortOrder || 0) + 1;

    await prisma.folder_images.create({
      data: {
        folderId: folderId,
        imageId: imageId,
        sortOrder: nextOrder
      }
    });

    await prisma.folders.update({
      where: { folderId: folderId },
      data: { 
        itemCount: { increment: 1 },
        updatedAt: new Date()
      }
    });

    return res.json({
      success: true,
      message: "Imagen añadida a la carpeta"
    });

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: "Error al añadir imagen a la carpeta"
    });
  }
};

// ============================================================================
// ➖ ELIMINAR IMAGEN DE CARPETA
// ============================================================================
export const removeImageFromFolder = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const folderId = parseInt(req.params.id);
    const imageId = parseInt(req.params.imageId);

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Usuario no autenticado"
      });
    }

    const folder = await prisma.folders.findFirst({
      where: {
        folderId: folderId,
        userId: userId
      }
    });

    if (!folder) {
      return res.status(404).json({
        success: false,
        error: "Carpeta no encontrada"
      });
    }

    const result = await prisma.folder_images.deleteMany({
      where: {
        folderId: folderId,
        imageId: imageId
      }
    });

    if (result.count === 0) {
      return res.status(404).json({
        success: false,
        error: "La imagen no está en esta carpeta"
      });
    }

    await prisma.folders.update({
      where: { folderId: folderId },
      data: { 
        itemCount: { decrement: 1 },
        updatedAt: new Date()
      }
    });

    return res.json({
      success: true,
      message: "Imagen eliminada de la carpeta"
    });

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: "Error al eliminar imagen de la carpeta"
    });
  }
};

// ============================================================================
// ➕ AÑADIR VIDEO A CARPETA
// ============================================================================
export const addVideoToFolder = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const folderId = parseInt(req.params.id);
    const { videoId } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Usuario no autenticado"
      });
    }

    const folder = await prisma.folders.findFirst({
      where: {
        folderId: folderId,
        userId: userId,
        deletedAt: null
      }
    });

    if (!folder) {
      return res.status(404).json({
        success: false,
        error: "Carpeta no encontrada"
      });
    }

    const video = await prisma.videos.findFirst({
      where: {
        videoId: videoId,
        userId: userId,
        deletedAt: null
      }
    });

    if (!video) {
      return res.status(404).json({
        success: false,
        error: "Video no encontrado"
      });
    }

    const existing = await prisma.folder_videos.findFirst({
      where: {
        folderId: folderId,
        videoId: videoId
      }
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: "El video ya está en esta carpeta"
      });
    }

    const lastItem = await prisma.folder_videos.findFirst({
      where: { folderId: folderId },
      orderBy: { sortOrder: 'desc' },
      select: { sortOrder: true }
    });
    
    const nextOrder = (lastItem?.sortOrder || 0) + 1;

    await prisma.folder_videos.create({
      data: {
        folderId: folderId,
        videoId: videoId,
        sortOrder: nextOrder
      }
    });

    await prisma.folders.update({
      where: { folderId: folderId },
      data: { 
        itemCount: { increment: 1 },
        updatedAt: new Date()
      }
    });

    return res.json({
      success: true,
      message: "Video añadido a la carpeta"
    });

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: "Error al añadir video a la carpeta"
    });
  }
};

// ============================================================================
// ➖ ELIMINAR VIDEO DE CARPETA
// ============================================================================
export const removeVideoFromFolder = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const folderId = parseInt(req.params.id);
    const videoId = parseInt(req.params.videoId);

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Usuario no autenticado"
      });
    }

    const folder = await prisma.folders.findFirst({
      where: {
        folderId: folderId,
        userId: userId
      }
    });

    if (!folder) {
      return res.status(404).json({
        success: false,
        error: "Carpeta no encontrada"
      });
    }

    const result = await prisma.folder_videos.deleteMany({
      where: {
        folderId: folderId,
        videoId: videoId
      }
    });

    if (result.count === 0) {
      return res.status(404).json({
        success: false,
        error: "El video no está en esta carpeta"
      });
    }

    await prisma.folders.update({
      where: { folderId: folderId },
      data: { 
        itemCount: { decrement: 1 },
        updatedAt: new Date()
      }
    });

    return res.json({
      success: true,
      message: "Video eliminado de la carpeta"
    });

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: "Error al eliminar video de la carpeta"
    });
  }
};

// ============================================================================
// 🗑️ MOVE FOLDER TO TRASH - VERSIÓN CORREGIDA
// ============================================================================
export const moveFolderToTrash = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const folderId = parseInt(req.params.id);

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Usuario no autenticado"
      });
    }

    const folder = await prisma.folders.findFirst({
      where: {
        folderId: folderId,
        userId: userId,
        deletedAt: null,
      },
    });

    if (!folder) {
      return res.status(404).json({ 
        success: false, 
        message: "Carpeta no encontrada" 
      });
    }

    if (folder.isSystem) {
      return res.status(400).json({
        success: false,
        error: "No se pueden eliminar carpetas del sistema"
      });
    }

    if (folder.itemCount && folder.itemCount > 0) {
      return res.status(400).json({
        success: false,
        error: `La carpeta contiene ${folder.itemCount} elementos. Vacía la carpeta antes de eliminarla.`
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.trash.create({
        data: {
          userId: folder.userId,
          itemType: 'folder',
          itemId: folder.folderId,
          originalName: folder.name,
          originalPath: `folders/${folder.folderId}`,
          fileSize: BigInt(0),
          mimeType: 'folder',
          metadata: JSON.stringify({
            name: folder.name,
            description: folder.description,
            color: folder.color,
            itemCount: folder.itemCount,
          }),
          createdAt: new Date(),
        },
      });

      await tx.folders.update({
        where: { folderId: folder.folderId },
        data: { deletedAt: new Date() },
      });
    });

    res.json({
      success: true,
      message: "🗑️ Carpeta movida a la papelera exitosamente",
      folderId: folderId,
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: "Error interno del servidor", 
      error: error instanceof Error ? error.message : String(error)
    });
  }
};