// src/middleware/multer.ts - VERSIÓN CORREGIDA
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import sharp from 'sharp';
import { Request, Response, NextFunction } from 'express';

// Tipos MIME permitidos
export const ALLOWED_MIME_TYPES = [
  // Imágenes
  'image/jpeg',   // iPhone, Android, web
  'image/png',    // Android, web
  'image/webp',   // web moderna
  'image/gif',    // animaciones
  'image/heic',   // iPhone moderno

  // Videos
  'video/quicktime', // .mov de iPhone
  'video/mp4',       // videos comunes en Android y web
  'video/avi',       // opcional, otros dispositivos
  'video/mkv'        // opcional, otros dispositivos
];

// Tamaño máximo por archivo (50MB)
export const MAX_FILE_SIZE = 50 * 1024 * 1024;

// Interface extendida para Request con user
interface AuthRequest extends Request {
  user?: {
    userId: number;
    email: string;
    username: string;
  };
}

// Configuración de almacenamiento
const storage = multer.diskStorage({
  destination: (req: Request, file, cb) => {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;

    if (!userId) {
      return cb(new Error('Usuario no autenticado'), '');
    }

    // Crear directorio de uploads si no existe
    const uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const userUploadPath = path.join(uploadsDir, userId.toString());

    if (!fs.existsSync(userUploadPath)) {
      fs.mkdirSync(userUploadPath, { recursive: true });
    }

    cb(null, userUploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4();
    const extension = path.extname(file.originalname).toLowerCase();
    const filename = `${Date.now()}-${uniqueId}${extension}`;
    cb(null, filename);
  }
});

// Filtro de archivos
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  console.log('🔍 Verificando archivo:', {
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size
  });

  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    console.log('✅ Tipo de archivo permitido');
    cb(null, true);
  } else {
    console.log('❌ Tipo de archivo NO permitido:', file.mimetype);
    cb(new Error(
      `Tipo de archivo no permitido: ${file.mimetype}. Solo se permiten: ${ALLOWED_MIME_TYPES.join(', ')}`
    ));
  }
};

// Configuración principal de multer
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 10
  }
});

// Middleware para subida única - CORREGIDO
export const uploadSingle = (req: Request, res: Response, next: NextFunction) => {
  console.log('🔄 Iniciando upload single...');
  
  const uploadMiddleware = upload.single('file');
  
  uploadMiddleware(req, res, async (err: any) => {
    if (err) {
      console.error('❌ Error en upload single:', err.message);
      return next(err);
    }

    console.log('📁 Archivo procesado:', req.file ? {
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    } : 'No file');

    // Convertir HEIC a JPEG si es necesario
    if (req.file && req.file.mimetype === 'image/heic') {
      console.log('🔄 Convirtiendo HEIC a JPEG...');
      const oldPath = req.file.path;
      const newPath = oldPath.replace(/\.heic$/i, '.jpg');

      try {
        await sharp(oldPath).jpeg({ quality: 90 }).toFile(newPath);
        fs.unlinkSync(oldPath); // eliminar HEIC original
        
        // Actualizar información del archivo
        req.file.path = newPath;
        req.file.filename = path.basename(newPath);
        req.file.mimetype = 'image/jpeg';
        
        console.log('✅ HEIC convertido a JPEG:', newPath);
      } catch (error) {
        console.error('❌ Error convirtiendo HEIC a JPEG:', error);
        return next(new Error('Error convirtiendo HEIC a JPEG'));
      }
    }

    next();
  });
};

// Middleware para subida múltiple - CORREGIDO
export const uploadMultiple = (req: Request, res: Response, next: NextFunction) => {
  console.log('🔄 Iniciando upload multiple...');
  
  const uploadMiddleware = upload.array('file', 10);
  
  uploadMiddleware(req, res, async (err: any) => {
    if (err) {
      console.error('❌ Error en upload multiple:', err.message);
      return next(err);
    }

    console.log('📁 Archivos procesados:', req.files ? 
      (req.files as Express.Multer.File[]).map(f => ({
        filename: f.filename,
        originalname: f.originalname,
        mimetype: f.mimetype,
        size: f.size
      })) : 'No files'
    );

    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files as Express.Multer.File[]) {
        if (file.mimetype === 'image/heic') {
          console.log('🔄 Convirtiendo HEIC a JPEG:', file.filename);
          const oldPath = file.path;
          const newPath = oldPath.replace(/\.heic$/i, '.jpg');
          try {
            await sharp(oldPath).jpeg({ quality: 90 }).toFile(newPath);
            fs.unlinkSync(oldPath);
            
            // Actualizar información del archivo
            file.path = newPath;
            file.filename = path.basename(newPath);
            file.mimetype = 'image/jpeg';
            
            console.log('✅ HEIC convertido a JPEG:', newPath);
          } catch (error) {
            console.error('❌ Error convirtiendo HEIC a JPEG:', error);
            return next(new Error('Error convirtiendo HEIC a JPEG'));
          }
        }
      }
    }

    next();
  });
};

// Middleware para crear thumbnails
export const createThumbnails = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (req.file && req.file.mimetype.startsWith('image/')) {
      const filePath = req.file.path;
      const fileDir = path.dirname(filePath);
      const fileName = path.basename(filePath, path.extname(filePath));
      
      // Crear directorio de thumbnails si no existe
      const thumbnailsDir = path.join(fileDir, 'thumbnails');
      if (!fs.existsSync(thumbnailsDir)) {
        fs.mkdirSync(thumbnailsDir, { recursive: true });
      }

      // Crear thumbnail (300x300)
      const thumbnailPath = path.join(thumbnailsDir, `${fileName}-thumb.jpg`);
      await sharp(filePath)
        .resize(300, 300, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 80 })
        .toFile(thumbnailPath);

      // Crear tamaño medio (800x600)
      const mediumDir = path.join(fileDir, 'medium');
      if (!fs.existsSync(mediumDir)) {
        fs.mkdirSync(mediumDir, { recursive: true });
      }

      const mediumPath = path.join(mediumDir, `${fileName}-medium.jpg`);
      await sharp(filePath)
        .resize(800, 600, {
          fit: 'inside',
          withoutEnlargement: true
        })
        .jpeg({ quality: 85 })
        .toFile(mediumPath);

      // Agregar paths a req.file
      (req.file as any).thumbnailPath = thumbnailPath;
      (req.file as any).mediumPath = mediumPath;

      console.log('✅ Thumbnails creados:', { thumbnailPath, mediumPath });
    }

    next();
  } catch (error) {
    console.error('❌ Error creando thumbnails:', error);
    next(error);
  }
};

// Función helper para crear directorios de usuario
export const createUserDirectories = (userId: number): void => {
  const basePath = path.join(process.cwd(), 'uploads');
  const directories = [
    path.join(basePath, userId.toString()),
    path.join(basePath, userId.toString(), 'thumbnails'),
    path.join(basePath, userId.toString(), 'medium')
  ];

  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log('📁 Directorio creado:', dir);
    }
  });
};

// Función para limpiar archivos temporales
export const cleanTempFiles = (files: Express.Multer.File[]): void => {
  files.forEach(file => {
    if (fs.existsSync(file.path)) {
      try {
        fs.unlinkSync(file.path);
        console.log('🧹 Archivo temporal eliminado:', file.path);
      } catch (error) {
        console.error('❌ Error eliminando archivo temporal:', file.path, error);
      }
    }
  });
};

// Middleware de manejo de errores para upload
export const handleUploadError = (error: any, req: Request, res: Response, next: NextFunction) => {
  console.error('💥 Error en middleware de upload:', error);

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        error: `El archivo es demasiado grande. Tamaño máximo: ${MAX_FILE_SIZE / 1024 / 1024}MB`
      });
    }
    
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'Demasiados archivos. Máximo 10 archivos por petición'
      });
    }
    
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        success: false,
        error: 'Campo de archivo inesperado'
      });
    }
  }

  if (error.message.includes('Tipo de archivo no permitido')) {
    return res.status(400).json({
      success: false,
      error: error.message
    });
  }

  if (error.message.includes('Usuario no autenticado')) {
    return res.status(401).json({
      success: false,
      error: 'Debe autenticarse para subir archivos'
    });
  }

  // Error genérico
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor al procesar el archivo'
  });
};

export default multer;