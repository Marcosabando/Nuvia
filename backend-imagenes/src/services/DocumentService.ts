// src/services/document.service.ts
import { Request, Response } from "express";
import prisma from '../lib/prisma';
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
    return `<embed src="${fileUrl}#toolbar=1&navpanes=0" type="application/pdf" style="width:100%; height:80vh;" />`;
  }
  
  if (mimeType.startsWith('image/')) {
    return `<img src="${fileUrl}" alt="${document.originalFilename}" style="max-width: 100%; max-height: 80vh; display: block; margin: 0 auto;" />`;
  }
  
  if (mimeType === 'text/plain' || mimeType === 'text/html' || 
      mimeType === 'application/json' || mimeType === 'application/xml') {
    return `<iframe src="${fileUrl}" sandbox="allow-same-origin" style="width:100%; height:80vh;"></iframe>`;
  }
  
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
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Usuario no autenticado"
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No se proporcionó ningún archivo"
      });
    }

    const file = req.file;
    
    if (!file.filename || !file.originalname || !file.path) {
      return res.status(400).json({
        success: false,
        error: "Información del archivo incompleta"
      });
    }
    
    const { title, description, tags, isPublic, category: bodyCategory } = req.body;
    const documentTitle = title?.trim() || path.parse(file.originalname).name;
    const documentInfo = (file as any).documentInfo || {};
    const category = bodyCategory || documentInfo.category || 'other';
    
    const validCategories = ['office', 'text', 'design', 'code', 'archive', 'other'];
    const finalCategory = validCategories.includes(category) ? category as any : 'other';
    const relativePath = `${userId}/documents/${file.filename}`;

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

    return res.status(201).json({
      success: true,
      data: document,
      message: "Documento subido exitosamente"
    });

  } catch (error: any) {
    if (req.file?.path && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (cleanupError) {}
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
    return res.status(500).json({
      success: false,
      error: "Error al obtener los documentos"
    });
  }
};

// ============================================================================
// CREAR NUEVO DOCUMENTO (SOLO METADATOS - SIN ARCHIVO)
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

    const validCategories = ['office', 'text', 'design', 'code', 'archive', 'other'];
    const finalCategory = validCategories.includes(category) ? category as any : 'other';

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
    return res.status(500).json({
      success: false,
      error: "Error al crear el documento"
    });
  }
};

// ============================================================================
// OBTENER DOCUMENTO POR ID
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

    if (isNaN(documentId)) {
      return res.status(400).json({
        success: false,
        error: "ID de documento inválido"
      });
    }

    const document = await prisma.documents.findFirst({
      where: {
        documentId: documentId,
        userId: userId,
        deletedAt: null,
      },
      include: {
        users: {
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
    return res.status(500).json({
      success: false,
      error: "Error al obtener el documento"
    });
  }
};

// ============================================================================
// ACTUALIZAR DOCUMENTO
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

    if (isNaN(documentId)) {
      return res.status(400).json({
        success: false,
        error: "ID de documento inválido"
      });
    }

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

    let finalCategory = existingDocument.category;
    if (category !== undefined) {
      const validCategories = ['office', 'text', 'design', 'code', 'archive', 'other'];
      finalCategory = validCategories.includes(category) ? category as any : 'other';
    }

    const updateData: any = {
      updatedAt: new Date(),
    };

    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description || null;
    if (category !== undefined) updateData.category = finalCategory;
    if (tags !== undefined) updateData.tags = tags;
    if (isFavorite !== undefined) updateData.isFavorite = isFavorite;
    if (isPublic !== undefined) updateData.isPublic = isPublic;

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
    return res.status(500).json({
      success: false,
      error: "Error al actualizar el documento"
    });
  }
};

// ============================================================================
// ELIMINAR DOCUMENTO (SOFT DELETE)
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

    if (isNaN(documentId)) {
      return res.status(400).json({
        success: false,
        error: "ID de documento inválido"
      });
    }

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
      message: "Documento movido a papelera",
      documentId: documentId
    });

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: "Error al eliminar el documento"
    });
  }
};

// ============================================================================
// BUSCAR DOCUMENTOS
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

    const where: any = {
      userId: userId,
      deletedAt: null,
    };

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

    const takeLimit = Math.min(parseInt(limit as string), 100);
    const skipOffset = parseInt(offset as string) || 0;

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
        skip: skipOffset,
        take: takeLimit,
      }),
      prisma.documents.count({ where }),
    ]);

    return res.json({
      success: true,
      data: documents,
      pagination: {
        total,
        limit: takeLimit,
        offset: skipOffset
      }
    });

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: "Error al buscar documentos"
    });
  }
};

// ============================================================================
// MARCAR/DESMARCAR COMO FAVORITO
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

    if (isNaN(documentId)) {
      return res.status(400).json({
        success: false,
        error: "ID de documento inválido"
      });
    }

    if (isFavorite === undefined) {
      return res.status(400).json({
        success: false,
        error: "El campo isFavorite es requerido"
      });
    }

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
    return res.status(500).json({
      success: false,
      error: "Error al actualizar favorito"
    });
  }
};

// ============================================================================
// OBTENER ESTADÍSTICAS DE DOCUMENTOS
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
        otherCount: totalDocuments - (officeCount + textCount + designCount + codeCount + archiveCount),
        favoriteCount,
        publicCount
      }
    });

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: "Error al obtener estadísticas de documentos"
    });
  }
};

// ============================================================================
// OBTENER DOCUMENTOS POR CATEGORÍA
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
    return res.status(500).json({
      success: false,
      error: "Error al obtener documentos por categoría"
    });
  }
};

// ============================================================================
// DESCARGAR DOCUMENTO
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

    if (isNaN(documentId)) {
      return res.status(400).json({
        success: false,
        error: "ID de documento inválido"
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

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: "Archivo no encontrado en el servidor",
      });
    }

    return res.download(filePath, document.originalFilename);
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: "Error al descargar el documento",
    });
  }
};

// ============================================================================
// PREVISUALIZAR DOCUMENTO
// ============================================================================
export const previewDocument = async (req: Request, res: Response) => {
  try {
    let userId = req.user?.userId;
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
        error: "Usuario no autenticado"
      });
    }

    const documentId = parseInt(req.params.id);
    
    if (isNaN(documentId)) {
      return res.status(400).json({
        success: false,
        error: "ID de documento inválido"
      });
    }

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

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: "Archivo no encontrado en el servidor"
      });
    }

    const mimeType: string = document.mimeType;

    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.removeHeader('X-Frame-Options');
    res.setHeader(
      'Content-Security-Policy',
      "frame-ancestors 'self' http://localhost:3000 http://localhost:5173 http://localhost:5174 http://localhost:4173 http://localhost:8080 http://127.0.0.1:3000 http://127.0.0.1:5173 http://127.0.0.1:5174 http://127.0.0.1:4173 http://127.0.0.1:8080"
    );
    res.setHeader('Accept-Ranges', 'bytes');

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;

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
      res.setHeader('Content-Type', mimeType);
      res.setHeader('Content-Disposition', 'inline');

      const fileStream = fs.createReadStream(filePath, { start, end });
      return fileStream.pipe(res);
    }

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Content-Length', fileSize.toString());
    const fileStream = fs.createReadStream(filePath);
    return fileStream.pipe(res);

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: "Error al previsualizar el documento"
    });
  }
};

// ============================================================================
// OBTENER URL DE PREVIEW
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

    if (isNaN(documentId)) {
      return res.status(400).json({
        success: false,
        error: "ID de documento inválido"
      });
    }

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
          'text/plain', 'text/html', 'text/css', 'application/json',
          'application/xml', 'text/xml'
        ].some(type => document.mimeType.includes(type))
      }
    });

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: "Error al obtener URL de preview"
    });
  }
};

// ============================================================================
// SERVIR DOCUMENTO
// ============================================================================
export const serveDocument = async (req: Request, res: Response) => {
  try {
    let userId = req.user?.userId;
    
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
    
    if (isNaN(documentId)) {
      return res.status(400).json({
        success: false,
        error: "ID de documento inválido"
      });
    }

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

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ 
        success: false, 
        error: "Archivo no existe" 
      });
    }

    res.setHeader('Content-Type', document.mimeType);
    res.setHeader('Content-Disposition', 'inline');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    
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

    res.setHeader('Content-Length', fileSize.toString());
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error: any) {
    return res.status(500).json({ 
      success: false, 
      error: "Error interno" 
    });
  }
};

// ============================================================================
// ABRIR DOCUMENTO
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

    if (isNaN(documentId)) {
      return res.status(400).json({
        success: false,
        error: "ID de documento inválido"
      });
    }

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

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: "Archivo no encontrado en el servidor"
      });
    }

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
    return res.status(500).json({
      success: false,
      error: "Error al abrir el documento"
    });
  }
};

// ============================================================================
// PREVIEW POR NOMBRE DE ARCHIVO
// ============================================================================
export const previewByFilename = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const filename = req.params.filename;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Usuario no autenticado"
      });
    }

    if (!filename || filename.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: "Nombre de archivo no proporcionado"
      });
    }

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
      return res.status(404).json({
        success: false,
        error: `Archivo "${filename}" no encontrado`
      });
    }

    return res.redirect(`/api/documents/${document.documentId}/preview`);

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: "Error al buscar documento"
    });
  }
};