// src/services/document.service.ts
import { Request, Response } from "express";
import prisma from '../lib/prisma'; // ✅ Instancia única
import path from "path";
import fs from "fs";
import jwt from "jsonwebtoken";

const jwtSecretEnv = process.env.JWT_SECRET;

if (!jwtSecretEnv) {
  throw new Error("JWT_SECRET no está definido en el .env");
}

const jwtSecret: string = jwtSecretEnv;

const normalizeUploadRelativePath = (p: string): string | null => {
  const cleaned = p.replace(/^[\\/]+/, '');
  const normalized = cleaned.replace(/\\/g, '/');
  if (normalized.includes('..')) return null;
  return normalized;
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
const getDocumentViewerHTML = (document: any): string => {
  const mimeType = document.mimeType.toLowerCase();
  const fileUrl = `/uploads/${document.documentPath}`;
  
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

// ============================================================================
// SUBIR DOCUMENTO
// ============================================================================
export const uploadDocument = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    
    console.log(' [UPLOAD] Iniciando subida de documento');
    console.log(' [UPLOAD] UserID:', userId);
    
    if (!userId) {
      console.error(' [UPLOAD] Usuario no autenticado');
      return res.status(401).json({
        success: false,
        error: "Usuario no autenticado"
      });
    }

    // Verificar que se subió un archivo
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
      size: file.size
    });
    
    // Validar que el archivo tiene los datos mínimos necesarios
    if (!file.filename || !file.originalname || !file.path) {
      console.error(' [UPLOAD] Archivo incompleto');
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
    
    // Validar categoría
    const validCategories = ['office', 'text', 'design', 'code', 'archive', 'other'];
    const finalCategory = validCategories.includes(category) ? category as any : 'other';
    
    // Crear ruta relativa para guardar en la BD
    const relativePath = `${userId}/documents/${file.filename}`;

    console.log(' [UPLOAD] Guardando en BD...');

    // ✅ INSERTAR CON PRISMA
    const document = await prisma.documents.create({
      data: {
        userId: userId,
        title: documentTitle,
        description: description || null,
        category: finalCategory,
        tags: tags || null,
        originalFilename: file.originalname,
        filename: file.filename,
        documentPath: relativePath,
        thumbnailPath: null,
        previewPath: null,
        fileSize: file.size,
        mimeType: file.mimetype,
        pageCount: null,
        wordCount: null,
        language: null,
        isFavorite: false,
        isPublic: isPublic === 'true' || isPublic === true,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
    });

    console.log(' [UPLOAD] Documento insertado con ID:', document.documentId);

    return res.status(201).json({
      success: true,
      data: document,
      message: "Documento subido exitosamente"
    });

  } catch (error: any) {
    console.error(" [UPLOAD] Error:", error.message);
    
    // Limpiar archivo si hay error
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
  try {
    const userId = req.user?.userId;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Usuario no autenticado"
      });
    }

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

    // Validar categoría
    const validCategories = ['office', 'text', 'design', 'code', 'archive', 'other'];
    const finalCategory = validCategories.includes(category) ? category as any : 'other';

    // ✅ CREAR DOCUMENTO CON PRISMA
    const document = await prisma.documents.create({
      data: {
        userId: userId,
        title: title.trim(),
        description: description || null,
        category: finalCategory,
        tags: tags || null,
        originalFilename: originalFilename,
        filename: filename,
        documentPath: documentPath,
        fileSize: fileSize || 0,
        mimeType: mimeType || 'application/octet-stream',
        thumbnailPath: null,
        previewPath: null,
        pageCount: null,
        wordCount: null,
        language: null,
        isFavorite: false,
        isPublic: isPublic || false,
        version: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
    });

    return res.status(201).json({
      success: true,
      data: document,
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

    if (!document) {
      return res.status(404).json({
        success: false,
        error: "Documento no encontrado"
      });
    }

    return res.json({
      success: true,
      data: document
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

    // Validar categoría si se proporciona
    let finalCategory = existingDocument.category;
    if (category !== undefined) {
      const validCategories = ['office', 'text', 'design', 'code', 'archive', 'other'];
      finalCategory = validCategories.includes(category) ? category as any : 'other';
    }

    // Construir datos de actualización
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description || null;
    if (category !== undefined) updateData.category = finalCategory;
    if (tags !== undefined) updateData.tags = tags;
    if (isFavorite !== undefined) updateData.isFavorite = isFavorite;
    if (isPublic !== undefined) updateData.isPublic = isPublic;

    // ✅ ACTUALIZAR CON PRISMA
    const updatedDocument = await prisma.documents.update({
      where: {
        documentId: documentId,
      },
      data: updateData,
    });

    return res.json({
      success: true,
      data: updatedDocument,
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

    // ✅ SOFT DELETE CON PRISMA
    await prisma.documents.update({
      where: {
        documentId: documentId,
      },
      data: {
        deletedAt: new Date(),
        updatedAt: new Date(),
      },
    });

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

    // Construir condiciones de búsqueda
    const where: any = {
      userId: userId,
      deletedAt: null,
    };

    // Aplicar filtros
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
  try {
    const userId = req.user?.userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Usuario no autenticado"
      });
    }

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
    const documentId = Number(req.params.id);

    if (!userId) {
      return res.status(401).json({
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
// 👁️ PREVISUALIZAR DOCUMENTO
// ============================================================================
export const previewDocument = async (req: Request, res: Response) => {
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
    const userId = req.user?.userId;
    const documentId = parseInt(req.params.id);

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Usuario no autenticado"
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
    const userId = req.user?.userId;
    const documentId = parseInt(req.params.id);

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Usuario no autenticado"
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
    console.error("❌ Error en preview por nombre:", error);
    return res.status(500).json({
      success: false,
      error: "Error al buscar documento"
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