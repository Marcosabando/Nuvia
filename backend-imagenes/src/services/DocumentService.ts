// src/services/DocumentService.ts
import { Request, Response } from "express";
import db from "@src/config/database";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import path from "path";

// ============================================================================
// 📤 SUBIR DOCUMENTO (NUEVO CONTROLADOR ESPECÍFICO PARA UPLOAD)
// ============================================================================
export const uploadDocument = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    console.log('📤 [UPLOAD] Iniciando subida de documento');
    console.log('👤 [UPLOAD] UserID:', userId);
    console.log('📄 [UPLOAD] req.file:', req.file);
    console.log('📝 [UPLOAD] req.body:', req.body);
    
    if (!userId) {
      console.error('❌ [UPLOAD] Usuario no autenticado');
      return res.status(401).json({
        success: false,
        error: "Usuario no autenticado"
      });
    }

    // Verificar que se subió un archivo
    if (!req.file) {
      console.error('❌ [UPLOAD] No se proporcionó archivo');
      return res.status(400).json({
        success: false,
        error: "No se proporcionó ningún archivo"
      });
    }

    const file = req.file;
    console.log('✅ [UPLOAD] Archivo recibido:', {
      fieldname: file.fieldname,
      originalname: file.originalname,
      filename: file.filename,
      mimetype: file.mimetype,
      size: file.size,
      path: file.path,
      destination: file.destination
    });
    
    // Validar que el archivo tiene los datos mínimos necesarios
    if (!file.filename || !file.originalname || !file.path) {
      console.error('❌ [UPLOAD] Archivo incompleto:', file);
      return res.status(400).json({
        success: false,
        error: "Información del archivo incompleta",
        details: {
          hasFilename: !!file.filename,
          hasOriginalname: !!file.originalname,
          hasPath: !!file.path
        }
      });
    }
    
    // Obtener metadatos del body (si existen)
    const { title, description, tags, isPublic, category: bodyCategory } = req.body;
    
    // Usar el título proporcionado o el nombre original del archivo (sin extensión)
    const documentTitle = title?.trim() || path.parse(file.originalname).name;
    
    // Extraer información del documento desde multer
    const documentInfo = (file as any).documentInfo || {};
    const category = bodyCategory || documentInfo.category || 'other';
    
    // Crear ruta relativa para guardar en la BD
    const relativePath = path.relative(
      path.join(process.cwd(), 'uploads'),
      file.path
    ).replace(/\\/g, '/'); // Normalizar para Windows

    console.log('💾 [UPLOAD] Datos para guardar en BD:', {
      userId,
      title: documentTitle,
      description: description || null,
      category,
      tags: tags || null,
      originalFilename: file.originalname,
      filename: file.filename,
      documentPath: relativePath,
      fileSize: file.size,
      mimeType: file.mimetype,
      isPublic: isPublic === 'true' || isPublic === true ? 1 : 0
    });

    // Insertar documento en la base de datos
    const [result] = await db.query<ResultSetHeader>(
      `INSERT INTO documents 
       (userId, title, description, category, tags, originalFilename, 
        filename, documentPath, fileSize, mimeType, isPublic, version)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
      [
        userId,
        documentTitle,
        description || null,
        category,
        tags || null,
        file.originalname,
        file.filename,
        relativePath,
        file.size,
        file.mimetype,
        isPublic === 'true' || isPublic === true ? 1 : 0
      ]
    );

    console.log('✅ [UPLOAD] Documento insertado en BD con ID:', result.insertId);

    // Obtener el documento recién creado
    const [newDocument] = await db.query<RowDataPacket[]>(
      `SELECT 
        documentId as id,
        documentId,
        userId,
        title,
        description,
        category,
        tags,
        originalFilename,
        filename,
        documentPath,
        fileSize,
        mimeType,
        pageCount,
        wordCount,
        language,
        isFavorite,
        isPublic,
        version,
        createdAt,
        updatedAt
      FROM documents 
      WHERE documentId = ?`,
      [result.insertId]
    );

    console.log('✅ [UPLOAD] Documento guardado exitosamente:', newDocument[0]);

    return res.status(201).json({
      success: true,
      data: newDocument[0],
      message: "Documento subido exitosamente"
    });

  } catch (error: any) {
    console.error("❌ [UPLOAD] Error subiendo documento:", error);
    console.error("❌ [UPLOAD] Error stack:", error.stack);
    
    // Si hay error, intentar eliminar el archivo subido
    if (req.file?.path) {
      try {
        const fs = require('fs');
        if (fs.existsSync(req.file.path)) {
          fs.unlinkSync(req.file.path);
          console.log('🧹 [UPLOAD] Archivo eliminado tras error:', req.file.path);
        }
      } catch (cleanupError) {
        console.error('❌ [UPLOAD] Error limpiando archivo:', cleanupError);
      }
    }
    
    return res.status(500).json({
      success: false,
      error: error.message || "Error al subir el documento",
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// ============================================================================
// 📋 OBTENER TODOS LOS DOCUMENTOS DEL USUARIO
// ============================================================================
export const getUserDocuments = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Usuario no autenticado"
      });
    }

    const [documents] = await db.query<RowDataPacket[]>(
      `SELECT 
        documentId as id,
        documentId,
        userId,
        title,
        description,
        category,
        tags,
        originalFilename,
        filename,
        documentPath,
        fileSize,
        mimeType,
        pageCount,
        wordCount,
        language,
        isFavorite,
        isPublic,
        version,
        createdAt,
        updatedAt
      FROM documents
      WHERE userId = ? AND deletedAt IS NULL
      ORDER BY createdAt DESC`,
      [userId]
    );

    return res.json({
      success: true,
      data: documents,
      count: documents.length
    });

  } catch (error: any) {
    console.error("❌ Error obteniendo documentos:", error);
    return res.status(500).json({
      success: false,
      error: "Error al obtener los documentos"
    });
  }
};

// ============================================================================
// 🆕 CREAR NUEVO DOCUMENTO (SOLO METADATOS - SIN ARCHIVO)
// ============================================================================
export const createDocument = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { 
      title, 
      description, 
      category, 
      tags, 
      originalFilename, 
      filename, 
      documentPath, 
      fileSize, 
      mimeType,
      pageCount,
      wordCount,
      language
    } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Usuario no autenticado"
      });
    }

    // Validación
    if (!title || title.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "El título del documento es requerido"
      });
    }

    if (!originalFilename || !filename || !documentPath) {
      return res.status(400).json({
        success: false,
        error: "Información del archivo incompleta"
      });
    }

    // Crear documento
    const [result] = await db.query<ResultSetHeader>(
      `INSERT INTO documents 
       (userId, title, description, category, tags, originalFilename, 
        filename, documentPath, fileSize, mimeType, pageCount, wordCount, language)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        title.trim(),
        description || null,
        category || 'other',
        tags || null,
        originalFilename,
        filename,
        documentPath,
        fileSize || 0,
        mimeType || 'application/octet-stream',
        pageCount || null,
        wordCount || null,
        language || null
      ]
    );

    // Obtener el documento creado
    const [newDocument] = await db.query<RowDataPacket[]>(
      `SELECT * FROM documents WHERE documentId = ?`,
      [result.insertId]
    );

    return res.status(201).json({
      success: true,
      data: newDocument[0],
      message: "Documento creado exitosamente"
    });

  } catch (error: any) {
    console.error("❌ Error creando documento:", error);
    return res.status(500).json({
      success: false,
      error: "Error al crear el documento"
    });
  }
};

// ============================================================================
// 📁 OBTENER DOCUMENTO POR ID
// ============================================================================
export const getDocumentById = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const documentId = parseInt(req.params.id);

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Usuario no autenticado"
      });
    }

    const [document] = await db.query<RowDataPacket[]>(
      `SELECT d.*, u.username, u.email
       FROM documents d
       INNER JOIN users u ON d.userId = u.userId
       WHERE d.documentId = ? AND d.userId = ? AND d.deletedAt IS NULL`,
      [documentId, userId]
    );

    if (document.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Documento no encontrado"
      });
    }

    return res.json({
      success: true,
      data: document[0]
    });

  } catch (error: any) {
    console.error("❌ Error obteniendo documento:", error);
    return res.status(500).json({
      success: false,
      error: "Error al obtener el documento"
    });
  }
};

// ============================================================================
// ✏️ ACTUALIZAR DOCUMENTO
// ============================================================================
export const updateDocument = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const documentId = parseInt(req.params.id);
    const { title, description, category, tags, isFavorite, isPublic } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Usuario no autenticado"
      });
    }

    // Verificar que el documento existe y pertenece al usuario
    const [document] = await db.query<RowDataPacket[]>(
      `SELECT documentId FROM documents 
       WHERE documentId = ? AND userId = ? AND deletedAt IS NULL`,
      [documentId, userId]
    );

    if (document.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Documento no encontrado"
      });
    }

    // Construir query de actualización dinámicamente
    const updates: string[] = [];
    const values: any[] = [];

    if (title !== undefined) {
      updates.push('title = ?');
      values.push(title.trim());
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description || null);
    }
    if (category !== undefined) {
      updates.push('category = ?');
      values.push(category);
    }
    if (tags !== undefined) {
      updates.push('tags = ?');
      values.push(tags);
    }
    if (isFavorite !== undefined) {
      updates.push('isFavorite = ?');
      values.push(isFavorite);
    }
    if (isPublic !== undefined) {
      updates.push('isPublic = ?');
      values.push(isPublic);
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        error: "No hay datos para actualizar"
      });
    }

    values.push(documentId);

    await db.query(
      `UPDATE documents SET ${updates.join(', ')} WHERE documentId = ?`,
      values
    );

    // Obtener documento actualizado
    const [updated] = await db.query<RowDataPacket[]>(
      `SELECT 
        documentId as id,
        documentId,
        userId,
        title,
        description,
        category,
        tags,
        originalFilename,
        filename,
        documentPath,
        fileSize,
        mimeType,
        pageCount,
        wordCount,
        language,
        isFavorite,
        isPublic,
        version,
        createdAt,
        updatedAt
      FROM documents WHERE documentId = ?`,
      [documentId]
    );

    return res.json({
      success: true,
      data: updated[0],
      message: "Documento actualizado exitosamente"
    });

  } catch (error: any) {
    console.error("❌ Error actualizando documento:", error);
    return res.status(500).json({
      success: false,
      error: "Error al actualizar el documento"
    });
  }
};

// ============================================================================
// 🗑️ ELIMINAR DOCUMENTO (SOFT DELETE)
// ============================================================================
export const deleteDocument = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const documentId = parseInt(req.params.id);

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Usuario no autenticado"
      });
    }

    // Verificar que el documento existe
    const [document] = await db.query<RowDataPacket[]>(
      `SELECT documentId FROM documents 
       WHERE documentId = ? AND userId = ? AND deletedAt IS NULL`,
      [documentId, userId]
    );

    if (document.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Documento no encontrado"
      });
    }

    // Soft delete
    await db.query(
      `UPDATE documents SET deletedAt = NOW() WHERE documentId = ?`,
      [documentId]
    );

    return res.json({
      success: true,
      message: "Documento eliminado exitosamente"
    });

  } catch (error: any) {
    console.error("❌ Error eliminando documento:", error);
    return res.status(500).json({
      success: false,
      error: "Error al eliminar el documento"
    });
  }
};

// ============================================================================
// 🔍 BUSCAR DOCUMENTOS
// ============================================================================
export const searchDocuments = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { q, category, isFavorite, limit = 50, offset = 0 } = req.query;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Usuario no autenticado"
      });
    }

    let query = `
      SELECT 
        documentId as id,
        documentId,
        title,
        description,
        category,
        tags,
        originalFilename,
        fileSize,
        mimeType,
        pageCount,
        wordCount,
        isFavorite,
        isPublic,
        createdAt,
        updatedAt
      FROM documents
      WHERE userId = ? AND deletedAt IS NULL
    `;
    
    const values: any[] = [userId];

    // Aplicar filtros
    if (q && typeof q === 'string' && q.trim().length > 0) {
      query += ` AND (title LIKE ? OR description LIKE ? OR tags LIKE ? OR originalFilename LIKE ?)`;
      const searchPattern = `%${q.trim()}%`;
      values.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    if (category && typeof category === 'string') {
      query += ` AND category = ?`;
      values.push(category);
    }

    if (isFavorite !== undefined) {
      query += ` AND isFavorite = ?`;
      values.push(isFavorite === 'true' ? 1 : 0);
    }

    query += ` ORDER BY createdAt DESC LIMIT ? OFFSET ?`;
    values.push(parseInt(limit as string), parseInt(offset as string));

    const [documents] = await db.query<RowDataPacket[]>(query, values);

    // Obtener total para paginación
    let countQuery = `SELECT COUNT(*) as total FROM documents WHERE userId = ? AND deletedAt IS NULL`;
    const countValues: any[] = [userId];

    if (q && typeof q === 'string' && q.trim().length > 0) {
      countQuery += ` AND (title LIKE ? OR description LIKE ? OR tags LIKE ? OR originalFilename LIKE ?)`;
      const searchPattern = `%${q.trim()}%`;
      countValues.push(searchPattern, searchPattern, searchPattern, searchPattern);
    }

    if (category && typeof category === 'string') {
      countQuery += ` AND category = ?`;
      countValues.push(category);
    }

    if (isFavorite !== undefined) {
      countQuery += ` AND isFavorite = ?`;
      countValues.push(isFavorite === 'true' ? 1 : 0);
    }

    const [totalResult] = await db.query<RowDataPacket[]>(countQuery, countValues);
    const total = totalResult[0]?.total || 0;

    return res.json({
      success: true,
      data: documents,
      pagination: {
        total,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      }
    });

  } catch (error: any) {
    console.error("❌ Error buscando documentos:", error);
    return res.status(500).json({
      success: false,
      error: "Error al buscar documentos"
    });
  }
};

// ============================================================================
// ⭐ MARCAR/DESMARCAR COMO FAVORITO
// ============================================================================
export const toggleFavorite = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const documentId = parseInt(req.params.id);
    const { isFavorite } = req.body;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Usuario no autenticado"
      });
    }

    if (isFavorite === undefined) {
      return res.status(400).json({
        success: false,
        error: "El campo isFavorite es requerido"
      });
    }

    // Verificar que el documento existe
    const [document] = await db.query<RowDataPacket[]>(
      `SELECT documentId FROM documents 
       WHERE documentId = ? AND userId = ? AND deletedAt IS NULL`,
      [documentId, userId]
    );

    if (document.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Documento no encontrado"
      });
    }

    // Actualizar favorito
    await db.query(
      `UPDATE documents SET isFavorite = ? WHERE documentId = ?`,
      [isFavorite ? 1 : 0, documentId]
    );

    return res.json({
      success: true,
      message: isFavorite ? "Documento marcado como favorito" : "Documento desmarcado como favorito"
    });

  } catch (error: any) {
    console.error("❌ Error actualizando favorito:", error);
    return res.status(500).json({
      success: false,
      error: "Error al actualizar favorito"
    });
  }
};

// ============================================================================
// 📊 OBTENER ESTADÍSTICAS DE DOCUMENTOS
// ============================================================================
export const getDocumentStats = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Usuario no autenticado"
      });
    }

    const [stats] = await db.query<RowDataPacket[]>(
      `SELECT 
        COUNT(*) as totalDocuments,
        SUM(fileSize) as totalSize,
        SUM(CASE WHEN category = 'office' THEN 1 ELSE 0 END) as officeCount,
        SUM(CASE WHEN category = 'text' THEN 1 ELSE 0 END) as textCount,
        SUM(CASE WHEN category = 'design' THEN 1 ELSE 0 END) as designCount,
        SUM(CASE WHEN category = 'code' THEN 1 ELSE 0 END) as codeCount,
        SUM(CASE WHEN category = 'archive' THEN 1 ELSE 0 END) as archiveCount,
        SUM(CASE WHEN isFavorite = 1 THEN 1 ELSE 0 END) as favoriteCount,
        SUM(CASE WHEN isPublic = 1 THEN 1 ELSE 0 END) as publicCount
      FROM documents
      WHERE userId = ? AND deletedAt IS NULL`,
      [userId]
    );

    return res.json({
      success: true,
      data: stats[0] || {}
    });

  } catch (error: any) {
    console.error("❌ Error obteniendo estadísticas:", error);
    return res.status(500).json({
      success: false,
      error: "Error al obtener estadísticas de documentos"
    });
  }
};

// ============================================================================
// 📁 OBTENER DOCUMENTOS POR CATEGORÍA
// ============================================================================
export const getDocumentsByCategory = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const category = req.params.category;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Usuario no autenticado"
      });
    }

    const validCategories = ['office', 'text', 'design', 'code', 'archive', 'other'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        error: "Categoría no válida"
      });
    }

    const [documents] = await db.query<RowDataPacket[]>(
      `SELECT 
        documentId as id,
        documentId,
        title,
        description,
        category,
        tags,
        originalFilename,
        fileSize,
        mimeType,
        pageCount,
        wordCount,
        isFavorite,
        isPublic,
        createdAt
      FROM documents
      WHERE userId = ? AND category = ? AND deletedAt IS NULL
      ORDER BY createdAt DESC`,
      [userId, category]
    );

    return res.json({
      success: true,
      data: documents,
      count: documents.length
    });

  } catch (error: any) {
    console.error("❌ Error obteniendo documentos por categoría:", error);
    return res.status(500).json({
      success: false,
      error: "Error al obtener documentos por categoría"
    });
  }
};