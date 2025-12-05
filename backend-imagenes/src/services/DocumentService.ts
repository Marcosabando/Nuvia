// src/services/DocumentService.ts - VERSIÓN COMPLETA CON PREVIEW
import { Request, Response } from "express";
import db from "@src/config/database";
import { ResultSetHeader, RowDataPacket } from "mysql2";
import path from "path";
import fs from "fs";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Obtener userId del request
 */
const getUserId = (req: Request): number | null => {
  const user = (req as any).user;
  console.log('🔍 [USER-DEBUG] Request user object:', user);
  console.log('🔍 [USER-DEBUG] Request headers:', req.headers);
  
  if (user && user.userId) {
    console.log('✅ [USER-DEBUG] UserId encontrado:', user.userId);
    return parseInt(user.userId);
  }
  
  console.error('❌ [USER-DEBUG] UserId NO encontrado en request');
  console.error('❌ [USER-DEBUG] Request user:', user);
  
  const authHeader = req.headers.authorization;
  if (authHeader) {
    console.log('🔐 [USER-DEBUG] Authorization header presente:', authHeader.substring(0, 20) + '...');
  }
  
  return null;
};

/**
 * Verificar autenticación
 */
const verifyAuth = (req: Request, res: Response): number | null => {
  const userId = getUserId(req);
  
  if (!userId) {
    console.error('❌ [AUTH] Usuario no autenticado');
    res.status(401).json({
      success: false,
      error: "Usuario no autenticado"
    });
    return null;
  }
  
  return userId;
};

/**
 * Determinar el tipo MIME basado en extensión
 */
const getMimeType = (filename: string, defaultMime = 'application/octet-stream'): string => {
  const ext = path.extname(filename).toLowerCase();
  
  const mimeTypes: Record<string, string> = {
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif',
    '.bmp': 'image/bmp',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.txt': 'text/plain',
    '.html': 'text/html',
    '.htm': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.xml': 'application/xml',
    '.md': 'text/markdown',
    '.csv': 'text/csv',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xls': 'application/vnd.ms-excel',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.ppt': 'application/vnd.ms-powerpoint',
    '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    '.zip': 'application/zip',
    '.rar': 'application/x-rar-compressed',
    '.7z': 'application/x-7z-compressed',
    '.tar': 'application/x-tar',
    '.gz': 'application/gzip',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.mp4': 'video/mp4',
    '.avi': 'video/x-msvideo',
    '.mov': 'video/quicktime',
    '.mkv': 'video/x-matroska',
  };
  
  return mimeTypes[ext] || defaultMime;
};

/**
 * Verificar si un tipo MIME se puede previsualizar inline
 */
const canPreviewInline = (mimeType: string): boolean => {
  if (!mimeType) return false;
  
  const mime = mimeType.toLowerCase();
  return (
    mime.includes('pdf') ||
    mime.startsWith('image/') ||
    mime.startsWith('text/') ||
    mime.includes('json') ||
    mime.includes('xml') ||
    mime.includes('html')
  );
};

// ============================================================================
// 📤 SUBIR DOCUMENTO
// ============================================================================
export const uploadDocument = async (req: Request, res: Response) => {
  const userId = verifyAuth(req, res);
  if (!userId) return;

  try {
    console.log('📤 [UPLOAD] Iniciando subida para usuario:', userId);
    
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
      size: file.size,
      path: file.path
    });

    const { title, description, tags, isPublic, category: bodyCategory } = req.body;
    const documentTitle = title?.trim() || path.parse(file.originalname).name;
    const documentInfo = (file as any).documentInfo || {};
    const category = bodyCategory || documentInfo.category || 'other';
    const relativePath = `${userId}/documents/${file.filename}`;

    console.log('💾 [UPLOAD] Guardando en BD con ruta:', relativePath);

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
    console.error("❌ [UPLOAD] Stack:", error.stack);
    
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
  const userId = verifyAuth(req, res);
  if (!userId) return;

  try {
    console.log('📁 [GET-DOCS] Obteniendo documentos para usuario:', userId);

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

    console.log(`✅ [GET-DOCS] Encontrados ${documents.length} documentos`);

    return res.json({
      success: true,
      data: documents,
      count: documents.length
    });

  } catch (error: any) {
    console.error("❌ [GET-DOCS] Error:", error);
    return res.status(500).json({
      success: false,
      error: "Error al obtener los documentos"
    });
  }
};

// ============================================================================
// 📁 OBTENER DOCUMENTO POR ID
// ============================================================================
export const getDocumentById = async (req: Request, res: Response) => {
  const userId = verifyAuth(req, res);
  if (!userId) return;

  try {
    const documentId = parseInt(req.params.id);
    console.log(`🔍 [GET-DOC] Buscando documento ${documentId} para usuario ${userId}`);

    const [document] = await db.query<RowDataPacket[]>(
      `SELECT d.*, u.username, u.email
       FROM documents d
       INNER JOIN users u ON d.userId = u.userId
       WHERE d.documentId = ? AND d.userId = ? AND d.deletedAt IS NULL`,
      [documentId, userId]
    );

    if (document.length === 0) {
      console.log(`❌ [GET-DOC] Documento ${documentId} no encontrado para usuario ${userId}`);
      return res.status(404).json({
        success: false,
        error: "Documento no encontrado"
      });
    }

    console.log(`✅ [GET-DOC] Documento encontrado:`, {
      id: document[0].documentId,
      title: document[0].title
    });

    return res.json({
      success: true,
      data: document[0]
    });

  } catch (error: any) {
    console.error("❌ [GET-DOC] Error:", error);
    return res.status(500).json({
      success: false,
      error: "Error al obtener el documento"
    });
  }
};

// ============================================================================
// 📥 DESCARGAR DOCUMENTO
// ============================================================================
export const downloadDocument = async (req: Request, res: Response) => {
  const userId = verifyAuth(req, res);
  if (!userId) return;

  try {
    const documentId = parseInt(req.params.id);
    console.log(`📥 [DOWNLOAD] Usuario ${userId} solicitando documento ${documentId}`);

    const [documents] = await db.query<RowDataPacket[]>(
      `SELECT * FROM documents 
       WHERE documentId = ? AND userId = ? AND deletedAt IS NULL`,
      [documentId, userId]
    );

    console.log(`📊 [DOWNLOAD] Resultados BD:`, documents);

    if (documents.length === 0) {
      console.log(`❌ [DOWNLOAD] Documento ${documentId} no encontrado para usuario ${userId}`);
      
      const [allDocs] = await db.query<RowDataPacket[]>(
        `SELECT documentId, userId FROM documents WHERE documentId = ?`,
        [documentId]
      );
      
      console.log(`🔍 [DOWNLOAD-DEBUG] Documento en sistema:`, allDocs);
      
      return res.status(404).json({
        success: false,
        error: "Documento no encontrado",
        debug: {
          requestedDocumentId: documentId,
          requestedUserId: userId,
          existsInSystem: allDocs.length > 0,
          existsForOtherUser: allDocs.length > 0 && allDocs[0].userId !== userId
        }
      });
    }

    const document = documents[0];
    console.log(`✅ [DOWNLOAD] Documento encontrado:`, {
      id: document.documentId,
      filename: document.originalFilename,
      dbPath: document.documentPath
    });

    const filePath = path.join(process.cwd(), 'uploads', document.documentPath);
    console.log(`📁 [DOWNLOAD] Ruta construida: ${filePath}`);

    if (!fs.existsSync(filePath)) {
      console.log(`❌ [DOWNLOAD] Archivo físico no encontrado: ${filePath}`);
      
      try {
        const uploadsDir = path.join(process.cwd(), 'uploads');
        console.log(`📂 [DEBUG] Directorio uploads: ${uploadsDir}`);
        
        if (fs.existsSync(uploadsDir)) {
          const files = fs.readdirSync(uploadsDir);
          console.log(`📂 [DEBUG] Contenido de uploads/:`, files);
          
          const userDir = path.join(uploadsDir, userId.toString());
          if (fs.existsSync(userDir)) {
            console.log(`📂 [DEBUG] Directorio usuario ${userId}:`, fs.readdirSync(userDir));
            
            const documentsDir = path.join(userDir, 'documents');
            if (fs.existsSync(documentsDir)) {
              console.log(`📂 [DEBUG] Archivos en documents/:`, fs.readdirSync(documentsDir));
            }
          }
        }
      } catch (dirError) {
        console.error('❌ [DEBUG] Error leyendo directorios:', dirError);
      }
      
      return res.status(404).json({
        success: false,
        error: "Archivo no encontrado en el servidor",
        debug: {
          documentPath: document.documentPath,
          expectedPath: filePath,
          userId: userId,
          fileExists: false
        }
      });
    }

    const safeFilename = encodeURIComponent(document.originalFilename);
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.setHeader('Content-Type', document.mimeType || 'application/octet-stream');
    res.setHeader('Content-Length', document.fileSize);
    res.setHeader('Cache-Control', 'no-cache');

    console.log(`🚀 [DOWNLOAD] Enviando archivo: ${document.originalFilename} (${document.fileSize} bytes)`);

    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error: any) {
    console.error("❌ [DOWNLOAD] Error:", error.message);
    console.error("❌ [DOWNLOAD] Stack:", error.stack);
    return res.status(500).json({
      success: false,
      error: "Error al descargar el documento"
    });
  }
};

// ============================================================================
// 👁️ PREVISUALIZAR DOCUMENTO - VERSIÓN MEJORADA
// ============================================================================
export const previewDocument = async (req: Request, res: Response) => {
  const userId = verifyAuth(req, res);
  if (!userId) return;

  try {
    const documentId = parseInt(req.params.id);
    const embed = req.query.embed === 'true';

    console.log(`👁️ [PREVIEW] Solicitud para documento ${documentId}, usuario ${userId}, embed: ${embed}`);

    // Obtener documento de la base de datos
    const [documents] = await db.query<RowDataPacket[]>(
      `SELECT * FROM documents 
       WHERE documentId = ? AND userId = ? AND deletedAt IS NULL`,
      [documentId, userId]
    );

    if (documents.length === 0) {
      console.log(`❌ [PREVIEW] Documento ${documentId} no encontrado para usuario ${userId}`);
      return res.status(404).json({
        success: false,
        error: "Documento no encontrado"
      });
    }

    const document = documents[0];
    const filePath = path.join(process.cwd(), 'uploads', document.documentPath);

    console.log(`📁 [PREVIEW] Ruta del archivo: ${filePath}`);
    console.log(`📄 [PREVIEW] Información del documento:`, {
      id: document.documentId,
      filename: document.originalFilename,
      mimeType: document.mimeType,
      fileSize: document.fileSize,
      documentPath: document.documentPath
    });

    // Verificar si el archivo existe
    if (!fs.existsSync(filePath)) {
      console.log(`❌ [PREVIEW] Archivo físico no encontrado: ${filePath}`);
      
      // Debug: mostrar estructura de directorios
      try {
        const uploadsDir = path.join(process.cwd(), 'uploads');
        const userDir = path.join(uploadsDir, userId.toString());
        const documentsDir = path.join(userDir, 'documents');
        
        console.log(`📂 [PREVIEW-DEBUG] Directorio uploads: ${uploadsDir}, existe: ${fs.existsSync(uploadsDir)}`);
        console.log(`📂 [PREVIEW-DEBUG] Directorio usuario: ${userDir}, existe: ${fs.existsSync(userDir)}`);
        console.log(`📂 [PREVIEW-DEBUG] Directorio documents: ${documentsDir}, existe: ${fs.existsSync(documentsDir)}`);
        
        if (fs.existsSync(documentsDir)) {
          console.log(`📂 [PREVIEW-DEBUG] Archivos en documents/:`, fs.readdirSync(documentsDir));
        }
      } catch (dirError) {
        console.error('❌ [PREVIEW-DEBUG] Error leyendo directorios:', dirError);
      }
      
      return res.status(404).json({
        success: false,
        error: "Archivo no encontrado en el servidor",
        debug: {
          documentId,
          documentPath: document.documentPath,
          expectedPath: filePath,
          fileExists: false
        }
      });
    }

    // Determinar el tipo MIME correcto
    const mimeType = getMimeType(document.originalFilename, document.mimeType);
    const canPreview = canPreviewInline(mimeType);
    
    console.log(`🔍 [PREVIEW] Tipo MIME: ${mimeType}, Se puede previsualizar: ${canPreview}`);

    // Si es para iframe (embed) o se puede previsualizar
    if (embed || canPreview) {
      console.log(`📄 [PREVIEW] Sirviendo archivo para ${embed ? 'iframe' : 'preview'}`);
      
      // Configurar headers
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(document.originalFilename)}"`);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      
      // Para PDFs, asegurarnos de que se muestren correctamente
      if (mimeType === 'application/pdf') {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(document.originalFilename)}"`);
      }
      
      // Para imágenes, asegurar que no se descarguen automáticamente
      if (mimeType.startsWith('image/')) {
        res.setHeader('Content-Type', mimeType);
      }
      
      // Stream el archivo
      const fileStream = fs.createReadStream(filePath);
      fileStream.on('error', (error) => {
        console.error('❌ [PREVIEW-STREAM] Error leyendo archivo:', error);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: "Error al leer el archivo"
          });
        }
      });
      
      fileStream.pipe(res);
      
    } else {
      // Si no se puede previsualizar, mostrar página informativa
      console.log(`ℹ️ [PREVIEW] Archivo no previsualizable, mostrando info`);
      
      const html = `
        <!DOCTYPE html>
        <html lang="es">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${document.originalFilename} - Vista previa</title>
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              margin: 0;
              padding: 20px;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .container {
              background: white;
              padding: 40px;
              border-radius: 16px;
              box-shadow: 0 20px 60px rgba(0,0,0,0.3);
              max-width: 500px;
              width: 100%;
              text-align: center;
            }
            .icon {
              font-size: 64px;
              margin-bottom: 20px;
            }
            h1 {
              color: #333;
              margin: 0 0 10px 0;
              font-size: 24px;
              word-break: break-all;
            }
            .file-info {
              background: #f8fafc;
              padding: 20px;
              border-radius: 8px;
              margin: 20px 0;
              text-align: left;
              border-left: 4px solid #4f46e5;
            }
            .file-info p {
              margin: 8px 0;
              color: #64748b;
            }
            .file-info strong {
              color: #334155;
            }
            .buttons {
              display: flex;
              gap: 10px;
              justify-content: center;
              margin-top: 30px;
            }
            button {
              padding: 12px 24px;
              border: none;
              border-radius: 8px;
              font-size: 16px;
              font-weight: 600;
              cursor: pointer;
              transition: all 0.3s ease;
              display: flex;
              align-items: center;
              justify-content: center;
              gap: 8px;
            }
            .download-btn {
              background: #10b981;
              color: white;
            }
            .download-btn:hover {
              background: #059669;
              transform: translateY(-2px);
            }
            .close-btn {
              background: #ef4444;
              color: white;
            }
            .close-btn:hover {
              background: #dc2626;
              transform: translateY(-2px);
            }
            .back-btn {
              background: #6b7280;
              color: white;
            }
            .back-btn:hover {
              background: #4b5563;
              transform: translateY(-2px);
            }
            .preview-notice {
              color: #f59e0b;
              font-weight: 600;
              padding: 10px;
              background: #fffbeb;
              border-radius: 6px;
              margin: 20px 0;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">📄</div>
            <h1>${document.originalFilename}</h1>
            <p class="preview-notice">
              ⚠️ Este tipo de archivo no se puede previsualizar en el navegador
            </p>
            
            <div class="file-info">
              <p><strong>📁 Tipo:</strong> ${mimeType}</p>
              <p><strong>📦 Tamaño:</strong> ${(document.fileSize / 1024 / 1024).toFixed(2)} MB</p>
              <p><strong>🏷️ Categoría:</strong> ${document.category || 'Sin categoría'}</p>
              <p><strong>📅 Creado:</strong> ${new Date(document.createdAt).toLocaleDateString()}</p>
            </div>
            
            <div class="buttons">
              <button class="download-btn" onclick="window.open('/api/documents/${documentId}/download', '_blank')">
                📥 Descargar
              </button>
              <button class="back-btn" onclick="window.history.back()">
                ↩️ Volver
              </button>
              ${embed ? `
              <button class="close-btn" onclick="window.close()">
                ✕ Cerrar
              </button>
              ` : ''}
            </div>
          </div>
          
          <script>
            // Para iframe: cerrar si se descarga el archivo
            if (${embed}) {
              document.querySelector('.download-btn').addEventListener('click', function() {
                setTimeout(() => {
                  if (window.parent !== window) {
                    window.parent.postMessage({ action: 'closePreview' }, '*');
                  }
                }, 1000);
              });
            }
          </script>
        </body>
        </html>
      `;
      
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    }

  } catch (error: any) {
    console.error("❌ [PREVIEW] Error:", error.message);
    console.error("❌ [PREVIEW] Stack:", error.stack);
    
    // Si el error ocurre después de enviar headers, no podemos enviar JSON
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        error: "Error al previsualizar el documento",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
};

// ============================================================================
// 🔍 BUSCAR DOCUMENTOS
// ============================================================================
export const searchDocuments = async (req: Request, res: Response) => {
  const userId = verifyAuth(req, res);
  if (!userId) return;

  try {
    const { q, category, isFavorite, limit = 50, offset = 0 } = req.query;

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
    console.error("❌ [SEARCH] Error:", error);
    return res.status(500).json({
      success: false,
      error: "Error al buscar documentos"
    });
  }
};

// ============================================================================
// 📊 ESTADÍSTICAS DE DOCUMENTOS
// ============================================================================
export const getDocumentStats = async (req: Request, res: Response) => {
  const userId = verifyAuth(req, res);
  if (!userId) return;

  try {
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
    console.error("❌ [STATS] Error:", error);
    return res.status(500).json({
      success: false,
      error: "Error al obtener estadísticas de documentos"
    });
  }
};

// ============================================================================
// ✏️ ACTUALIZAR DOCUMENTO
// ============================================================================
export const updateDocument = async (req: Request, res: Response) => {
  const userId = verifyAuth(req, res);
  if (!userId) return;

  try {
    const documentId = parseInt(req.params.id);
    const { title, description, category, tags, isFavorite, isPublic } = req.body;

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
    console.error("❌ [UPDATE] Error:", error);
    return res.status(500).json({
      success: false,
      error: "Error al actualizar el documento"
    });
  }
};

// ============================================================================
// ⭐ MARCAR/DESMARCAR COMO FAVORITO
// ============================================================================
export const toggleFavorite = async (req: Request, res: Response) => {
  const userId = verifyAuth(req, res);
  if (!userId) return;

  try {
    const documentId = parseInt(req.params.id);
    const { isFavorite } = req.body;

    if (isFavorite === undefined) {
      return res.status(400).json({
        success: false,
        error: "El campo isFavorite es requerido"
      });
    }

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

    await db.query(
      `UPDATE documents SET isFavorite = ? WHERE documentId = ?`,
      [isFavorite ? 1 : 0, documentId]
    );

    return res.json({
      success: true,
      message: isFavorite ? "Documento marcado como favorito" : "Documento desmarcado como favorito"
    });

  } catch (error: any) {
    console.error("❌ [FAVORITE] Error:", error);
    return res.status(500).json({
      success: false,
      error: "Error al actualizar favorito"
    });
  }
};

// ============================================================================
// 🗑️ ELIMINAR DOCUMENTO (SOFT DELETE)
// ============================================================================
export const deleteDocument = async (req: Request, res: Response) => {
  const userId = verifyAuth(req, res);
  if (!userId) return;

  try {
    const documentId = parseInt(req.params.id);

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

    await db.query(
      `UPDATE documents SET deletedAt = NOW() WHERE documentId = ?`,
      [documentId]
    );

    return res.json({
      success: true,
      message: "Documento eliminado exitosamente"
    });

  } catch (error: any) {
    console.error("❌ [DELETE] Error:", error);
    return res.status(500).json({
      success: false,
      error: "Error al eliminar el documento"
    });
  }
};

// ============================================================================
// 📂 DOCUMENTOS POR CATEGORÍA
// ============================================================================
export const getDocumentsByCategory = async (req: Request, res: Response) => {
  const userId = verifyAuth(req, res);
  if (!userId) return;

  try {
    const category = req.params.category;

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
    console.error("❌ [CATEGORY] Error:", error);
    return res.status(500).json({
      success: false,
      error: "Error al obtener documentos por categoría"
    });
  }
};

// ============================================================================
// 🆕 CREAR NUEVO DOCUMENTO (SOLO METADATOS - SIN ARCHIVO)
// ============================================================================
export const createDocumentMetadata = async (req: Request, res: Response) => {
  const userId = verifyAuth(req, res);
  if (!userId) return;

  try {
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
    console.error("❌ [CREATE-METADATA] Error:", error);
    return res.status(500).json({
      success: false,
      error: "Error al crear el documento"
    });
  }
};

// ============================================================================
// 🛠️ DEBUG: Verificar estructura de archivos
// ============================================================================
export const debugFiles = async (req: Request, res: Response) => {
  const userId = verifyAuth(req, res);
  if (!userId) return;

  try {
    console.log(`🔍 [DEBUG] Verificando archivos para usuario ${userId}`);
    
    const [documents] = await db.query<RowDataPacket[]>(
      `SELECT documentId, originalFilename, filename, documentPath 
       FROM documents 
       WHERE userId = ? AND deletedAt IS NULL
       ORDER BY documentId DESC`,
      [userId]
    );

    const documentsWithStatus = await Promise.all(
      documents.map(async (doc) => {
        const filePath = path.join(process.cwd(), 'uploads', doc.documentPath);
        const exists = fs.existsSync(filePath);
        
        return {
          id: doc.documentId,
          originalFilename: doc.originalFilename,
          filename: doc.filename,
          documentPath: doc.documentPath,
          expectedPath: filePath,
          fileExists: exists
        };
      })
    );

    const uploadsDir = path.join(process.cwd(), 'uploads');
    const userDir = path.join(uploadsDir, userId.toString());
    const documentsDir = path.join(userDir, 'documents');

    const directoryStructure = {
      uploadsDir: {
        path: uploadsDir,
        exists: fs.existsSync(uploadsDir),
        contents: fs.existsSync(uploadsDir) ? fs.readdirSync(uploadsDir) : []
      },
      userDir: {
        path: userDir,
        exists: fs.existsSync(userDir),
        contents: fs.existsSync(userDir) ? fs.readdirSync(userDir) : []
      },
      documentsDir: {
        path: documentsDir,
        exists: fs.existsSync(documentsDir),
        contents: fs.existsSync(documentsDir) ? fs.readdirSync(documentsDir) : []
      }
    };

    return res.json({
      success: true,
      userId,
      documents: documentsWithStatus,
      directoryStructure,
      totalDocuments: documents.length,
      existingFiles: documentsWithStatus.filter(d => d.fileExists).length
    });

  } catch (error: any) {
    console.error("❌ [DEBUG] Error:", error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};