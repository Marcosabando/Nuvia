// src/services/FolderService.ts
import { Request, Response } from "express";
import db from "@src/config/database";
import { ResultSetHeader, RowDataPacket } from "mysql2";

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

    const [folders] = await db.query<RowDataPacket[]>(
      `SELECT 
        folderId,
        userId,
        name,
        description,
        parentFolderId,
        color,
        isSystem,
        sortOrder,
        itemCount,
        createdAt,
        updatedAt
      FROM folders
      WHERE userId = ? AND deletedAt IS NULL
      ORDER BY isSystem DESC, sortOrder ASC, name ASC`,
      [userId]
    );

    return res.json({
      success: true,
      data: folders,
      count: folders.length
    });

  } catch (error: any) {
    console.error("❌ Error obteniendo carpetas:", error);
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

    // Validación
    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "El nombre de la carpeta es requerido"
      });
    }

    // Verificar si ya existe una carpeta con el mismo nombre
    const [existing] = await db.query<RowDataPacket[]>(
      `SELECT folderId FROM folders 
       WHERE userId = ? AND name = ? AND deletedAt IS NULL`,
      [userId, name.trim()]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        error: "Ya existe una carpeta con ese nombre"
      });
    }

    // Obtener el último sortOrder
    const [lastFolder] = await db.query<RowDataPacket[]>(
      `SELECT MAX(sortOrder) as maxOrder FROM folders WHERE userId = ?`,
      [userId]
    );
    
    const nextOrder = (lastFolder[0]?.maxOrder || 0) + 1;

    // Crear carpeta
    const [result] = await db.query<ResultSetHeader>(
      `INSERT INTO folders 
       (userId, name, description, parentFolderId, color, sortOrder, isSystem)
       VALUES (?, ?, ?, ?, ?, ?, FALSE)`,
      [
        userId,
        name.trim(),
        description || null,
        parentFolderId || null,
        color || '#6c757d',
        nextOrder
      ]
    );

    // Obtener la carpeta creada
    const [newFolder] = await db.query<RowDataPacket[]>(
      `SELECT * FROM folders WHERE folderId = ?`,
      [result.insertId]
    );

    return res.status(201).json({
      success: true,
      data: newFolder[0],
      message: "Carpeta creada exitosamente"
    });

  } catch (error: any) {
    console.error("❌ Error creando carpeta:", error);
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

    const [folder] = await db.query<RowDataPacket[]>(
      `SELECT * FROM folders 
       WHERE folderId = ? AND userId = ? AND deletedAt IS NULL`,
      [folderId, userId]
    );

    if (folder.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Carpeta no encontrada"
      });
    }

    return res.json({
      success: true,
      data: folder[0]
    });

  } catch (error: any) {
    console.error("❌ Error obteniendo carpeta:", error);
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

    // Verificar que la carpeta existe y pertenece al usuario
    const [folder] = await db.query<RowDataPacket[]>(
      `SELECT isSystem FROM folders 
       WHERE folderId = ? AND userId = ? AND deletedAt IS NULL`,
      [folderId, userId]
    );

    if (folder.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Carpeta no encontrada"
      });
    }

    // No permitir editar carpetas del sistema
    if (folder[0].isSystem) {
      return res.status(403).json({
        success: false,
        error: "No se pueden editar carpetas del sistema"
      });
    }

    // Construir query de actualización dinámicamente
    const updates: string[] = [];
    const values: any[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name.trim());
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description || null);
    }
    if (color !== undefined) {
      updates.push('color = ?');
      values.push(color);
    }
    if (sortOrder !== undefined) {
      updates.push('sortOrder = ?');
      values.push(sortOrder);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No hay datos para actualizar"
      });
    }

    values.push(folderId);

    await db.query(
      `UPDATE folders SET ${updates.join(', ')} WHERE folderId = ?`,
      values
    );

    // Obtener carpeta actualizada
    const [updated] = await db.query<RowDataPacket[]>(
      `SELECT * FROM folders WHERE folderId = ?`,
      [folderId]
    );

    return res.json({
      success: true,
      data: updated[0],
      message: "Carpeta actualizada exitosamente"
    });

  } catch (error: any) {
    console.error("❌ Error actualizando carpeta:", error);
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

    // Verificar que la carpeta existe
    const [folder] = await db.query<RowDataPacket[]>(
      `SELECT isSystem, itemCount FROM folders 
       WHERE folderId = ? AND userId = ? AND deletedAt IS NULL`,
      [folderId, userId]
    );

    if (folder.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Carpeta no encontrada"
      });
    }

    // No permitir eliminar carpetas del sistema
    if (folder[0].isSystem) {
      return res.status(403).json({
        success: false,
        error: "No se pueden eliminar carpetas del sistema"
      });
    }

    // Advertir si la carpeta tiene contenido
    if (folder[0].itemCount > 0) {
      return res.status(400).json({
        success: false,
        error: `La carpeta contiene ${folder[0].itemCount} elementos. Vacía la carpeta antes de eliminarla.`
      });
    }

    // Soft delete
    await db.query(
      `UPDATE folders SET deletedAt = NOW() WHERE folderId = ?`,
      [folderId]
    );

    return res.json({
      success: true,
      message: "Carpeta eliminada exitosamente"
    });

  } catch (error: any) {
    console.error("❌ Error eliminando carpeta:", error);
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

    // Verificar que la carpeta existe
    const [folder] = await db.query<RowDataPacket[]>(
      `SELECT * FROM folders 
       WHERE folderId = ? AND userId = ? AND deletedAt IS NULL`,
      [folderId, userId]
    );

    if (folder.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Carpeta no encontrada"
      });
    }

    // Obtener imágenes de la carpeta
    const [images] = await db.query<RowDataPacket[]>(
      `SELECT i.*, fi.sortOrder 
       FROM images i
       INNER JOIN folder_images fi ON i.imageId = fi.imageId
       WHERE fi.folderId = ? AND i.deletedAt IS NULL
       ORDER BY fi.sortOrder ASC, i.createdAt DESC`,
      [folderId]
    );

    // Obtener videos de la carpeta
    const [videos] = await db.query<RowDataPacket[]>(
      `SELECT v.*, fv.sortOrder 
       FROM videos v
       INNER JOIN folder_videos fv ON v.videoId = fv.videoId
       WHERE fv.folderId = ? AND v.deletedAt IS NULL
       ORDER BY fv.sortOrder ASC, v.createdAt DESC`,
      [folderId]
    );

    return res.json({
      success: true,
      data: {
        folder: folder[0],
        images,
        videos,
        totalItems: images.length + videos.length
      }
    });

  } catch (error: any) {
    console.error("❌ Error obteniendo contenido de carpeta:", error);
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

    // Verificar carpeta
    const [folder] = await db.query<RowDataPacket[]>(
      `SELECT folderId FROM folders 
       WHERE folderId = ? AND userId = ? AND deletedAt IS NULL`,
      [folderId, userId]
    );

    if (folder.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Carpeta no encontrada"
      });
    }

    // Verificar imagen
    const [image] = await db.query<RowDataPacket[]>(
      `SELECT imageId FROM images 
       WHERE imageId = ? AND userId = ? AND deletedAt IS NULL`,
      [imageId, userId]
    );

    if (image.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Imagen no encontrada"
      });
    }

    // Verificar si ya está en la carpeta
    const [existing] = await db.query<RowDataPacket[]>(
      `SELECT * FROM folder_images WHERE folderId = ? AND imageId = ?`,
      [folderId, imageId]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        error: "La imagen ya está en esta carpeta"
      });
    }

    // Añadir imagen
    await db.query(
      `INSERT INTO folder_images (folderId, imageId) VALUES (?, ?)`,
      [folderId, imageId]
    );

    return res.json({
      success: true,
      message: "Imagen añadida a la carpeta"
    });

  } catch (error: any) {
    console.error("❌ Error añadiendo imagen a carpeta:", error);
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

    // Verificar permisos
    const [folder] = await db.query<RowDataPacket[]>(
      `SELECT folderId FROM folders WHERE folderId = ? AND userId = ?`,
      [folderId, userId]
    );

    if (folder.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Carpeta no encontrada"
      });
    }

    // Eliminar relación
    const [result] = await db.query<ResultSetHeader>(
      `DELETE FROM folder_images WHERE folderId = ? AND imageId = ?`,
      [folderId, imageId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: "La imagen no está en esta carpeta"
      });
    }

    return res.json({
      success: true,
      message: "Imagen eliminada de la carpeta"
    });

  } catch (error: any) {
    console.error("❌ Error eliminando imagen de carpeta:", error);
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

    // Verificar carpeta
    const [folder] = await db.query<RowDataPacket[]>(
      `SELECT folderId FROM folders 
       WHERE folderId = ? AND userId = ? AND deletedAt IS NULL`,
      [folderId, userId]
    );

    if (folder.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Carpeta no encontrada"
      });
    }

    // Verificar video
    const [video] = await db.query<RowDataPacket[]>(
      `SELECT videoId FROM videos 
       WHERE videoId = ? AND userId = ? AND deletedAt IS NULL`,
      [videoId, userId]
    );

    if (video.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Video no encontrado"
      });
    }

    // Verificar si ya está en la carpeta
    const [existing] = await db.query<RowDataPacket[]>(
      `SELECT * FROM folder_videos WHERE folderId = ? AND videoId = ?`,
      [folderId, videoId]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        error: "El video ya está en esta carpeta"
      });
    }

    // Añadir video
    await db.query(
      `INSERT INTO folder_videos (folderId, videoId) VALUES (?, ?)`,
      [folderId, videoId]
    );

    return res.json({
      success: true,
      message: "Video añadido a la carpeta"
    });

  } catch (error: any) {
    console.error("❌ Error añadiendo video a carpeta:", error);
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

    // Verificar permisos
    const [folder] = await db.query<RowDataPacket[]>(
      `SELECT folderId FROM folders WHERE folderId = ? AND userId = ?`,
      [folderId, userId]
    );

    if (folder.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Carpeta no encontrada"
      });
    }

    // Eliminar relación
    const [result] = await db.query<ResultSetHeader>(
      `DELETE FROM folder_videos WHERE folderId = ? AND videoId = ?`,
      [folderId, videoId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        error: "El video no está en esta carpeta"
      });
    }

    return res.json({
      success: true,
      message: "Video eliminado de la carpeta"
    });

  } catch (error: any) {
    console.error("❌ Error eliminando video de carpeta:", error);
    return res.status(500).json({
      success: false,
      error: "Error al eliminar video de la carpeta"
    });
  }
};