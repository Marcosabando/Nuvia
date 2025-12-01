// src/services/DocumentService.ts
import { Request, Response } from "express";
import db from "@src/config/database";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import path from "path";
import fs from "fs";


// ============================================================================
// 📤 SUBIR DOCUMENTO (NUEVO CONTROLADOR ESPECÍFICO PARA UPLOAD)
// ============================================================================
export const uploadDocument = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    console.log('📤 [UPLOAD] Iniciando subida de documento');
    console.log('👤 [UPLOAD] UserID:', userId);
    
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
      originalname: file.originalname,
      filename: file.filename,
      mimetype: file.mimetype,
      size: file.size
    });
    
    // Validar que el archivo tiene los datos mínimos necesarios
    if (!file.filename || !file.originalname || !file.path) {
      console.error('❌ [UPLOAD] Archivo incompleto');
      return res.status(400).json({
        success: false,
        error: "Información del archivo incompleta"
      });
    }
    
    // Obtener metadatos del body
    const { title, description, tags, isPublic, category: bodyCategory } = req.body;
    
    // Usar el título proporcionado o el nombre original del archivo
    const documentTitle = title?.trim() || path.parse(file.originalname).name;
    
    // Extraer información del documento
    const documentInfo = (file as any).documentInfo || {};
    const category = bodyCategory || documentInfo.category || 'other';
    
    // Crear ruta relativa para guardar en la BD
    const relativePath = `/${userId}/documents/${file.filename}`;

    console.log('💾 [UPLOAD] Guardando en BD...');

    // Insertar documento en la base de datos
    const [result] = await db.query<ResultSetHeader>(
      `INSERT INTO documents 
       (userId, title, description, category, tags, originalFilename, 
        filename, documentPath, fileSize, mimeType, isPublic)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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

    console.log('✅ [UPLOAD] Documento insertado con ID:', result.insertId);

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
        isFavorite,
        isPublic,
        createdAt,
        updatedAt
      FROM documents 
      WHERE documentId = ?`,
      [result.insertId]
    );

    console.log('✅ [UPLOAD] Documento guardado exitosamente');

    return res.status(201).json({
      success: true,
      data: newDocument[0],
      message: "Documento subido exitosamente"
    });

  } catch (error: any) {
    console.error("❌ [UPLOAD] Error:", error.message);
    
    // Limpiar archivo si hay error
    if (req.file?.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
        console.log('🧹 Archivo eliminado tras error');
      } catch (cleanupError) {
        console.error('❌ Error limpiando archivo:', cleanupError);
      }
    }
    
    return res.status(500).json({
      success: false,
      error: "Error al subir el documento",
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
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
export const createDocumentMetadata = async (req: Request, res: Response) => {
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
      isPublic
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
        filename, documentPath, fileSize, mimeType, isPublic)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        isPublic || 0
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

// ============================================================================
// 📥 DESCARGAR DOCUMENTO
// ============================================================================
export const downloadDocument = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const documentId = parseInt(req.params.id);

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Usuario no autenticado"
      });
    }

    // Obtener documento
    const [documents] = await db.query<RowDataPacket[]>(
      `SELECT * FROM documents 
       WHERE documentId = ? AND userId = ? AND deletedAt IS NULL`,
      [documentId, userId]
    );

    if (documents.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Documento no encontrado"
      });
    }

    const document = documents[0];
    const filePath = path.join(process.cwd(), 'uploads', document.documentPath);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: "Archivo no encontrado en el servidor"
      });
    }

    // Configurar headers para descarga
    res.setHeader('Content-Disposition', `attachment; filename="${document.originalFilename}"`);
    res.setHeader('Content-Type', document.mimeType);
    res.setHeader('Content-Length', document.fileSize);

    // Enviar archivo
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error: any) {
    console.error("❌ Error descargando documento:", error);
    return res.status(500).json({
      success: false,
      error: "Error al descargar el documento"
    });
  }
};

// ============================================================================
// 👁️ PREVISUALIZAR DOCUMENTO
// ============================================================================
export const previewDocument = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const documentId = parseInt(req.params.id);
    const filename = req.params.filename; // Opcional: aceptar también por nombre

    console.log('🔍 [PREVIEW] Parámetros recibidos:', { 
      documentId, 
      filename,
      userId 
    });

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Usuario no autenticado"
      });
    }

    let query = `SELECT * FROM documents WHERE userId = ? AND deletedAt IS NULL`;
    const params: any[] = [userId];
    
    // Buscar por ID o por nombre de archivo
    if (documentId && !isNaN(documentId)) {
      query += ` AND documentId = ?`;
      params.push(documentId);
    } else if (filename) {
      query += ` AND (filename = ? OR originalFilename = ?)`;
      params.push(filename, filename);
    } else {
      return res.status(400).json({
        success: false,
        error: "Se requiere ID o nombre de archivo"
      });
    }

    console.log('📄 [PREVIEW] Query:', query, params);

    const [documents] = await db.query<RowDataPacket[]>(query, params);

    console.log('📄 [PREVIEW] Resultados encontrados:', documents.length);

    if (documents.length === 0) {
      // Listar todos los documentos disponibles para debug
      const [allDocs] = await db.query<RowDataPacket[]>(
        `SELECT documentId, title, originalFilename FROM documents 
         WHERE userId = ? AND deletedAt IS NULL`,
        [userId]
      );
      
      console.log('📋 [PREVIEW] Documentos disponibles:', allDocs);
      
      return res.status(404).json({
        success: false,
        error: "Documento no encontrado",
        availableDocuments: allDocs.map(doc => ({
          id: doc.documentId,
          title: doc.title,
          filename: doc.originalFilename
        }))
      });
    }

    const document = documents[0];
    console.log('✅ [PREVIEW] Documento encontrado:', {
      id: document.documentId,
      filename: document.filename,
      originalname: document.originalFilename,
      documentPath: document.documentPath
    });

    // Resto del código original...
    const filePath = path.join(process.cwd(), 'uploads', document.documentPath);
    
    // ... resto del código igual

  } catch (error: any) {
    console.error("❌ [PREVIEW] Error:", error.message);
    console.error(error.stack);
    
    return res.status(500).json({
      success: false,
      error: "Error al previsualizar el documento"
    });
  }
};

export const getPreviewUrl = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const documentId = parseInt(req.params.id);

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Usuario no autenticado"
      });
    }

    // Obtener documento
    const [documents] = await db.query<RowDataPacket[]>(
      `SELECT * FROM documents 
       WHERE documentId = ? AND userId = ? AND deletedAt IS NULL`,
      [documentId, userId]
    );

    if (documents.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Documento no encontrado"
      });
    }

    const document = documents[0];
    
    // Devolver URL directa al archivo (para usar en <iframe> o <embed>)
    const fileUrl = `/uploads${document.documentPath}`;
    
    return res.json({
      success: true,
      data: {
        url: fileUrl,
        mimeType: document.mimeType,
        filename: document.originalFilename,
        canPreviewInline: [
          'application/pdf',
          'image/jpeg', 'image/png', 'image/gif', 'image/webp',
          'text/plain', 'text/html'
        ].includes(document.mimeType)
      }
    });

  } catch (error: any) {
    console.error("❌ Error obteniendo URL de preview:", error);
    return res.status(500).json({
      success: false,
      error: "Error al obtener URL de preview"
    });
  }
};

export const openDocument = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const documentId = parseInt(req.params.id);

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Usuario no autenticado"
      });
    }

    // Obtener documento
    const [documents] = await db.query<RowDataPacket[]>(
      `SELECT * FROM documents 
       WHERE documentId = ? AND userId = ? AND deletedAt IS NULL`,
      [documentId, userId]
    );

    if (documents.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Documento no encontrado"
      });
    }

    const document = documents[0];
    const filePath = path.join(process.cwd(), 'uploads', document.documentPath);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: "Archivo no encontrado en el servidor"
      });
    }

    // Crear página HTML simple para abrir el documento
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${document.originalFilename}</title>
          <style>
            body { margin: 0; padding: 20px; background: #f5f5f5; }
            .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 1px solid #eee; }
            .filename { font-size: 18px; font-weight: bold; color: #333; }
            .actions { display: flex; gap: 10px; }
            .btn { padding: 8px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; text-decoration: none; font-size: 14px; }
            .btn:hover { background: #0056b3; }
            .btn.download { background: #28a745; }
            .btn.download:hover { background: #1e7e34; }
            .viewer { width: 100%; min-height: 500px; border: 1px solid #ddd; border-radius: 4px; }
            iframe, embed { width: 100%; height: 600px; border: none; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="filename">${document.originalFilename}</div>
              <div class="actions">
                <a href="/api/documents/${documentId}/download" class="btn download">Descargar</a>
                <button onclick="window.close()" class="btn">Cerrar</button>
              </div>
            </div>
            
            <div class="viewer">
              ${getDocumentViewerHTML(document)}
            </div>
          </div>
          
          <script>
            // Auto-cerrar después de 5 segundos si es una imagen
            if ('${document.mimeType}'.startsWith('image/')) {
              setTimeout(() => {
                if (confirm('¿Deseas cerrar esta ventana?')) {
                  window.close();
                }
              }, 5000);
            }
          </script>
        </body>
      </html>
    `;

    res.send(html);

  } catch (error: any) {
    console.error("❌ Error abriendo documento:", error);
    return res.status(500).json({
      success: false,
      error: "Error al abrir el documento"
    });
  }
};

const getDocumentViewerHTML = (document: any): string => {
  const mimeType = document.mimeType.toLowerCase();
  const fileUrl = `/uploads${document.documentPath}`;
  
  if (mimeType === 'application/pdf') {
    return `<embed src="${fileUrl}#toolbar=1&navpanes=0" type="application/pdf" />`;
  }
  
  if (mimeType.startsWith('image/')) {
    return `<img src="${fileUrl}" alt="${document.originalFilename}" style="max-width: 100%; max-height: 80vh; display: block; margin: 0 auto;" />`;
  }
  
  if (mimeType === 'text/plain' || mimeType === 'text/html' || 
      mimeType === 'application/json' || mimeType === 'application/xml') {
    return `<iframe src="${fileUrl}" sandbox="allow-same-origin"></iframe>`;
  }
  
  // Para otros tipos, mostrar mensaje y botón de descarga
  return `
    <div style="text-align: center; padding: 40px;">
      <h3>Este tipo de archivo no se puede previsualizar directamente</h3>
      <p>${document.originalFilename} (${document.mimeType})</p>
      <a href="/api/documents/${document.documentId}/download" class="btn download" style="margin-top: 20px;">
        Descargar archivo
      </a>
    </div>
  `;
};

export const previewByFilename = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const filename = req.params.filename;

    console.log('🔍 [PREVIEW-BY-FILENAME] Buscando archivo:', filename);

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Usuario no autenticado"
      });
    }

    // Buscar por nombre de archivo
    const [documents] = await db.query<RowDataPacket[]>(
      `SELECT * FROM documents 
       WHERE (filename = ? OR originalFilename = ?) 
       AND userId = ? AND deletedAt IS NULL`,
      [filename, filename, userId]
    );

    if (documents.length === 0) {
      console.log('❌ [PREVIEW-BY-FILENAME] Archivo no encontrado');
      return res.status(404).json({
        success: false,
        error: `Archivo "${filename}" no encontrado`
      });
    }

    const document = documents[0];
    
    // Redirigir a la ruta de preview normal
    return res.redirect(`/api/documents/${document.documentId}/preview`);

  } catch (error: any) {
    console.error("❌ Error en preview por nombre:", error);
    return res.status(500).json({
      success: false,
      error: "Error al buscar documento"
    });
  }
};