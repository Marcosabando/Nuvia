// src/services/DocumentService.ts - VERSIÓN COMPLETA CON PREVIEW
import { Request, Response } from "express";
import prisma from '../lib/prisma'; // ✅ Instancia única
import path from "path";
import fs from "fs";
import jwt from "jsonwebtoken";

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
      console.error(' [UPLOAD] No se proporcionó archivo');
      return res.status(400).json({
        success: false,
        error: "No se proporcionó ningún archivo"
      });
    }

    const file = req.file;
    console.log(' [UPLOAD] Archivo recibido:', {
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
      data: document,
      message: "Documento subido exitosamente"
    });

  } catch (error: any) {
    console.error("❌ [UPLOAD] Error:", error.message);
    console.error("❌ [UPLOAD] Stack:", error.stack);
    
    if (req.file?.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
        console.log(' Archivo eliminado tras error');
      } catch (cleanupError) {
        console.error(' Error limpiando archivo:', cleanupError);
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
// OBTENER TODOS LOS DOCUMENTOS DEL USUARIO
// ============================================================================
export const getUserDocuments = async (req: Request, res: Response) => {
  const userId = verifyAuth(req, res);
  if (!userId) return;

  try {
    console.log('📁 [GET-DOCS] Obteniendo documentos para usuario:', userId);

    const documents = await prisma.documents.findMany({
      where: {
        userId: userId,
        deletedAt: null,
      },
      select: {
        documentId: true,
        userId: true,
        title: true,
        description: true,
        category: true,
        tags: true,
        originalFilename: true,
        filename: true,
        documentPath: true,
        thumbnailPath: true,
        previewPath: true,
        fileSize: true,
        mimeType: true,
        pageCount: true,
        wordCount: true,
        language: true,
        isFavorite: true,
        isPublic: true,
        version: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

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

    const document = await prisma.documents.findFirst({
      where: {
        documentId: documentId,
        userId: userId,
        deletedAt: null,
      },
      include: {
        users: { // ✅ CORREGIDO: 'users' no 'user'
          select: {
            username: true,
            email: true,
          },
        },
      },
    });

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
      data: document
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
      const searchPattern = q.trim();
      where.OR = [
        { title: { contains: searchPattern } },
        { description: { contains: searchPattern } },
        { tags: { contains: searchPattern } },
        { originalFilename: { contains: searchPattern } },
      ];
    }

    if (category && typeof category === 'string') {
      const validCategories = ['office', 'text', 'design', 'code', 'archive', 'other'];
      where.category = validCategories.includes(category) ? category : 'other';
    }

    if (isFavorite !== undefined) {
      where.isFavorite = isFavorite === 'true';
    }

    // ✅ CONSULTA CON PRISMA
    const [documents, total] = await Promise.all([
      prisma.documents.findMany({
        where,
        select: {
          documentId: true,
          userId: true,
          title: true,
          description: true,
          category: true,
          tags: true,
          originalFilename: true,
          fileSize: true,
          mimeType: true,
          pageCount: true,
          wordCount: true,
          isFavorite: true,
          isPublic: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: parseInt(offset as string),
        take: parseInt(limit as string),
      }),
      prisma.documents.count({ where }),
    ]);

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
    const existingDocument = await prisma.documents.findFirst({
      where: {
        documentId: documentId,
        userId: userId,
        deletedAt: null,
      },
    });

    if (!existingDocument) {
      return res.status(404).json({
        success: false,
        error: "Documento no encontrado"
      });
    }

    // ✅ ACTUALIZAR FAVORITO CON PRISMA
    await prisma.documents.update({
      where: {
        documentId: documentId,
      },
      data: {
        isFavorite: isFavorite,
        updatedAt: new Date(),
      },
    });

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
  const userId = verifyAuth(req, res);
  if (!userId) return;

    // ✅ AGREGACIONES CON PRISMA
    const [
      totalDocuments,
      totalSizeResult,
      officeCount,
      textCount,
      designCount,
      codeCount,
      archiveCount,
      favoriteCount,
      publicCount
    ] = await Promise.all([
      prisma.documents.count({
        where: { userId, deletedAt: null },
      }),
      prisma.documents.aggregate({
        where: { userId, deletedAt: null },
        _sum: { fileSize: true },
      }),
      prisma.documents.count({
        where: { userId, category: 'office', deletedAt: null },
      }),
      prisma.documents.count({
        where: { userId, category: 'text', deletedAt: null },
      }),
      prisma.documents.count({
        where: { userId, category: 'design', deletedAt: null },
      }),
      prisma.documents.count({
        where: { userId, category: 'code', deletedAt: null },
      }),
      prisma.documents.count({
        where: { userId, category: 'archive', deletedAt: null },
      }),
      prisma.documents.count({
        where: { userId, isFavorite: true, deletedAt: null },
      }),
      prisma.documents.count({
        where: { userId, isPublic: true, deletedAt: null },
      }),
    ]);

    const totalSize = totalSizeResult._sum.fileSize ? Number(totalSizeResult._sum.fileSize) : 0;

    return res.json({
      success: true,
      data: {
        totalDocuments,
        totalSize,
        totalSizeFormatted: (totalSize / (1024 * 1024)).toFixed(2) + " MB",
        officeCount,
        textCount,
        designCount,
        codeCount,
        archiveCount,
        favoriteCount,
        publicCount
      }
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

    // ✅ CONSULTA CON PRISMA
    const documents = await prisma.documents.findMany({
      where: {
        userId: userId,
        category: category as any,
        deletedAt: null,
      },
      select: {
        documentId: true,
        userId: true,
        title: true,
        description: true,
        category: true,
        tags: true,
        originalFilename: true,
        fileSize: true,
        mimeType: true,
        pageCount: true,
        wordCount: true,
        isFavorite: true,
        isPublic: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

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
    const userId = req.user?.userId;
    const documentId = Number(req.params.id);

    if (isFavorite === undefined) {
      return res.status(400).json({
        success: false,
        error: "Usuario no autenticado",
      });
    }

    const document = await prisma.documents.findFirst({
      where: {
        documentId: documentId,
        userId: userId,
        deletedAt: null,
      },
      select: {
        documentPath: true,
        originalFilename: true,
        mimeType: true,
        fileSize: true,
      },
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: "Documento no encontrado",
      });
    }

    const safeRelativePath = normalizeUploadRelativePath(document.documentPath);
    if (!safeRelativePath) {
      return res.status(400).json({
        success: false,
        error: "Ruta de documento inválida",
      });
    }

    const filePath = path.join(process.cwd(), 'uploads', safeRelativePath);

    console.log("📄 Descargando archivo:", filePath);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: "Archivo no encontrado en el servidor",
      });
    }

    return res.download(filePath, document.originalFilename);
  } catch (error) {
    console.error("❌ Error descargando documento:", error);
    return res.status(500).json({
      success: false,
      error: "Error al descargar el documento",
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
    console.log('[PREVIEW] Iniciando...');
    
    // Autenticación
    let userId = req.user?.userId;
    if (!userId && req.query.token) {
      try {
        const decoded = jwt.verify(req.query.token as string, jwtSecret) as any;
        userId = decoded.userId;
      } catch (err) {
        return res.status(401).json({ error: "Token inválido" });
      }
    }

    if (!userId) {
      return res.status(401).json({ error: "No autenticado" });
    }

    const documentId = parseInt(req.params.id);
    const document = await prisma.documents.findFirst({
      where: { documentId, userId, deletedAt: null }
    });

    if (!document) {
      return res.status(404).json({ error: "Documento no encontrado" });
    }

    // Construir ruta
    let filePath = document.documentPath;
    
    // Asegurar que tenga el prefijo correcto
    if (!filePath.includes('uploads/')) {
      filePath = path.join('uploads', filePath);
    }
    
    const absolutePath = path.join(process.cwd(), filePath);
    console.log('[PREVIEW] Ruta absoluta:', absolutePath);

    if (!fs.existsSync(absolutePath)) {
      console.error('[PREVIEW] Archivo no existe:', absolutePath);
      return res.status(404).json({ error: "Archivo no encontrado" });
    }

    // Leer archivo completo en memoria para verificar
    const fileBuffer = fs.readFileSync(absolutePath);
    const fileSize = fileBuffer.length;
    
    console.log('[PREVIEW] Tamaño real del archivo:', fileSize, 'bytes');
    console.log('[PREVIEW] Primeros bytes:', fileBuffer.slice(0, 10).toString('hex'));
    
    // Verificar que sea un PDF
    const isPdf = fileBuffer.slice(0, 4).toString() === '%PDF';
    if (!isPdf) {
      console.error('[PREVIEW] No es un PDF válido. Cabecera:', fileBuffer.slice(0, 20).toString());
      return res.status(400).json({ 
        error: "El archivo no es un PDF válido",
        debug: { header: fileBuffer.slice(0, 20).toString('hex') }
      });
    }

    // 🔴 IMPORTANTE: IGNORAR COMPLETAMENTE LAS SOLICITUDES DE RANGO
    // Establecer headers para PDF
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(document.originalFilename)}"`);
    res.setHeader('Content-Length', fileSize.toString());
    res.setHeader('Cache-Control', 'public, max-age=3600');
    
    // 🔴 CRÍTICO: NO enviar headers de rango
    res.removeHeader('Accept-Ranges');
    res.removeHeader('Content-Range');
    
    // Permitir CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.removeHeader('X-Frame-Options');
    
    // Enviar archivo completo
    console.log('[PREVIEW] Enviando archivo completo de', fileSize, 'bytes');
    res.send(fileBuffer);
    
    console.log('[PREVIEW] Archivo enviado exitosamente');

  } catch (error: any) {
    console.error('[PREVIEW] Error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Error interno del servidor" });
    }
  }
};

// ============================================================================
// 🔗 OBTENER URL DE PREVIEW
// ============================================================================
export const getPreviewUrl = async (req: Request, res: Response) => {
  try {
    const category = req.params.category;

    const validCategories = ['office', 'text', 'design', 'code', 'archive', 'other'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        error: "Categoría no válida"
      });
    }

    // Obtener documento
    const document = await prisma.documents.findFirst({
      where: {
        documentId: documentId,
        userId: userId,
        deletedAt: null,
      },
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: "Documento no encontrado"
      });
    }

    // Devolver URL directa al archivo
    const safeRelativePath = normalizeUploadRelativePath(document.documentPath);
    if (!safeRelativePath) {
      return res.status(400).json({
        success: false,
        error: "Ruta de documento inválida",
      });
    }

    const fileUrl = `/uploads/${safeRelativePath}`;
    
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
// 📤 SERVIR DOCUMENTO
// ============================================================================
export const serveDocument = async (req: Request, res: Response) => {
  try {
    // SOPORTAR TOKEN EN QUERY PARAM (para WebViewer)
    let userId = req.user?.userId;
    
    // Si no hay auth header, intentar con token en query
    if (!userId && req.query.token) {
      try {
        const decoded = jwt.verify(req.query.token as string, jwtSecret) as any;
        userId = decoded.userId;
      } catch (err) {
        return res.status(401).json({ 
          success: false, 
          error: "Token inválido" 
        });
      }
    }

    if (!userId) {
      return res.status(401).json({ 
        success: false, 
        error: "No autenticado" 
      });
    }

    const documentId = parseInt(req.params.id);

    const document = await prisma.documents.findFirst({
      where: {
        documentId: documentId,
        userId: userId,
        deletedAt: null,
      },
    });

    if (!document) {
      return res.status(404).json({ 
        success: false, 
        error: "Documento no encontrado" 
      });
    }

    const safeRelativePath = normalizeUploadRelativePath(document.documentPath);
    if (!safeRelativePath) {
      return res.status(400).json({
        success: false,
        error: "Ruta de documento inválida",
      });
    }

    const filePath = path.join(process.cwd(), 'uploads', safeRelativePath);

    console.log(' [SERVE] Sirviendo:', filePath);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ 
        success: false, 
        error: "Archivo no existe" 
      });
    }

    // Headers correctos para CORS y caching
    res.setHeader('Content-Type', document.mimeType);
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    // Soporte de Range Requests
    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    res.setHeader('Accept-Ranges', 'bytes');

    const range = req.headers.range;
    if (range) {
      const match = /^bytes=(\d*)-(\d*)$/.exec(range);
      if (!match) {
        return res.status(416).send('Range Not Satisfiable');
      }

      const start = match[1] ? parseInt(match[1], 10) : 0;
      const end = match[2] ? parseInt(match[2], 10) : fileSize - 1;

      if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= fileSize) {
        res.setHeader('Content-Range', `bytes */${fileSize}`);
        return res.status(416).send('Range Not Satisfiable');
      }

      const chunkSize = end - start + 1;
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${fileSize}`);
      res.setHeader('Content-Length', chunkSize.toString());

      const fileStream = fs.createReadStream(filePath, { start, end });
      fileStream.pipe(res);
      return;
    }

    // Sin Range: enviar archivo completo
    res.setHeader('Content-Length', fileSize.toString());
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error: any) {
    console.error(" [SERVE] Error:", error);
    return res.status(500).json({ 
      success: false, 
      error: "Error interno" 
    });
  }
};

// ============================================================================
// 🚀 ABRIR DOCUMENTO
// ============================================================================
export const openDocument = async (req: Request, res: Response) => {
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

    // Obtener documento
    const document = await prisma.documents.findFirst({
      where: {
        documentId: documentId,
        userId: userId,
        deletedAt: null,
      },
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: "Información del archivo incompleta"
      });
    }

    const filePath = path.join(process.cwd(), 'uploads', document.documentPath);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: "Archivo no encontrado en el servidor"
      });
    }

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
// 🔎 PREVIEW POR NOMBRE DE ARCHIVO
// ============================================================================
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
    const document = await prisma.documents.findFirst({
      where: {
        OR: [
          { filename: filename },
          { originalFilename: filename }
        ],
        userId: userId,
        deletedAt: null,
      },
    });

    if (!document) {
      console.log('❌ [PREVIEW-BY-FILENAME] Archivo no encontrado');
      return res.status(404).json({
        success: false,
        error: `Archivo "${filename}" no encontrado`
      });
    }

    // Redirigir a la ruta de preview normal
    return res.redirect(`/api/documents/${document.documentId}/preview`);

  } catch (error: any) {
    console.error("❌ [DEBUG] Error:", error);
    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ============================================================================
// 🗑️ MOVE TO TRASH (DOCUMENTOS) - VERSIÓN CORREGIDA
// ============================================================================
export const moveDocumentToTrash = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const documentId = parseInt(req.params.id);

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Usuario no autenticado"
      });
    }

    // 1️⃣ Find the document
    const document = await prisma.documents.findFirst({
      where: {
        documentId: documentId,
        userId: userId,
        deletedAt: null,
      },
    });

    if (!document) {
      return res.status(404).json({ 
        success: false, 
        message: "Documento no encontrado" 
      });
    }

    // Fix path if needed
    let correctPath = document.documentPath;
    if (!correctPath.includes('/documents/')) {
      const parts = correctPath.split('/');
      if (parts.length >= 3) {
        const userId = parts[1];
        const filename = parts.slice(2).join('/');
        correctPath = `uploads/${userId}/documents/${filename}`;
      }
    }

    console.log('📄 Moving document to trash:', {
      documentId: document.documentId,
      documentPath: document.documentPath,
      correctPath: correctPath,
      filename: document.filename,
      originalFilename: document.originalFilename
    });

    // 2️⃣ Insert into trash with Prisma transaction
    await prisma.$transaction(async (tx) => {
      // Insert into trash
      await tx.trash.create({
        data: {
          userId: document.userId,
          itemType: 'document',
          itemId: document.documentId,
          originalName: document.originalFilename,
          originalPath: correctPath,
          fileSize: document.fileSize,
          mimeType: document.mimeType,
          metadata: JSON.stringify({
            title: document.title,
            category: document.category,
            tags: document.tags,
          }),
          createdAt: new Date(),
        },
      });

      // Soft delete document
      await tx.documents.update({
        where: { documentId: document.documentId },
        data: { deletedAt: new Date() },
      });
    });

    res.json({
      success: true,
      message: "🗑️ Document moved to trash successfully",
      documentId: documentId,
    });
  } catch (error) {
    console.error("❌ Error moving document to trash:", error);
    res.status(500).json({ 
      success: false, 
      message: "Internal server error", 
      error: error instanceof Error ? error.message : String(error)
    });
  }
};