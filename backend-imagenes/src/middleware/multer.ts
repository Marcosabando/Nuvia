// src/middleware/multer.ts - VERSIÓN CORREGIDA CON ESTRUCTURA POR USUARIO
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import sharp from 'sharp';
import { Request, Response, NextFunction } from 'express';

// Tipos MIME permitidos
export const ALLOWED_MIME_TYPES = [
  // Imágenes
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',

  // Videos
  'video/quicktime',
  'video/mp4',
  'video/avi',
  'video/mkv',
  'video/webm',
  'video/x-msvideo',
  'video/x-matroska'
];

// Tamaños máximos
export const MAX_IMAGE_SIZE = 50 * 1024 * 1024; // 50MB para imágenes
export const MAX_VIDEO_SIZE = 2 * 1024 * 1024 * 1024; // 2GB para videos

// Interface extendida para Request con user
interface AuthRequest extends Request {
  user?: {
    userId: number;
    email: string;
    username: string;
  };
}

// ✅ CONFIGURACIÓN CORREGIDA: Estructura por usuario con subcarpetas
const getStorage = (fileType: 'image' | 'video') => {
  return multer.diskStorage({
    destination: (req: Request, file, cb) => {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.userId;

      if (!userId) {
        return cb(new Error('Usuario no autenticado'), '');
      }

      // Crear directorio base de uploads si no existe
      const uploadsDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      // ✅ ESTRUCTURA: uploads/userId/images/ y uploads/userId/videos/
      const userDir = path.join(uploadsDir, userId.toString());
      const typeDir = path.join(userDir, fileType === 'image' ? 'images' : 'videos');

      // Crear directorios recursivamente: uploads/userId/images|videos/
      if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true });
        console.log('📁 Directorio de usuario creado:', userDir);
      }

      if (!fs.existsSync(typeDir)) {
        fs.mkdirSync(typeDir, { recursive: true });
        console.log('📁 Subdirectorio creado:', typeDir);
      }

      console.log(`💾 Guardando ${fileType} en:`, typeDir);
      cb(null, typeDir);
    },
    filename: (req, file, cb) => {
      const uniqueId = uuidv4();
      const extension = path.extname(file.originalname).toLowerCase();
      const filename = `${Date.now()}-${uniqueId}${extension}`;
      cb(null, filename);
    }
  });
};

// Filtro de archivos general
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

// ✅ CONFIGURACIÓN PARA IMÁGENES
export const uploadImage = multer({
  storage: getStorage('image'),
  fileFilter: (req, file, cb) => {
    const imageMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/heic'
    ];

    if (imageMimeTypes.includes(file.mimetype)) {
      console.log('✅ Imagen aceptada:', file.mimetype);
      cb(null, true);
    } else {
      console.log('❌ Tipo de imagen no permitido:', file.mimetype);
      cb(new Error(`Tipo de imagen no permitido: ${file.mimetype}`));
    }
  },
  limits: {
    fileSize: MAX_IMAGE_SIZE,
    files: 10
  }
});

// ✅ CONFIGURACIÓN PARA VIDEOS
export const uploadVideo = multer({
  storage: getStorage('video'),
  fileFilter: (req, file, cb) => {
    const videoMimeTypes = [
      'video/mp4',
      'video/webm',
      'video/quicktime',
      'video/x-msvideo',
      'video/x-matroska',
      'video/avi',
      'video/mkv'
    ];

    if (videoMimeTypes.includes(file.mimetype)) {
      console.log('✅ Video aceptado:', file.mimetype);
      cb(null, true);
    } else {
      console.log('❌ Tipo de video no permitido:', file.mimetype);
      cb(new Error(`Tipo de video no permitido: ${file.mimetype}`));
    }
  },
  limits: {
    fileSize: MAX_VIDEO_SIZE,
    files: 5 // Menos videos que imágenes por petición
  }
});

// Middleware para subida única de imágenes
export const uploadSingleImage = (req: Request, res: Response, next: NextFunction) => {
  console.log('🖼️ Iniciando upload de imagen...');
  
  const uploadMiddleware = uploadImage.single('file');
  
  uploadMiddleware(req, res, async (err: any) => {
    if (err) {
      console.error('❌ Error en upload de imagen:', err.message);
      return next(err);
    }

    if (req.file) {
      console.log('📁 Imagen procesada:', {
        filename: req.file.filename,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path,
        destination: req.file.destination
      });

      // Convertir HEIC a JPEG si es necesario
      if (req.file.mimetype === 'image/heic') {
        console.log('🔄 Convirtiendo HEIC a JPEG...');
        const oldPath = req.file.path;
        const newPath = oldPath.replace(/\.heic$/i, '.jpg');

        try {
          await sharp(oldPath).jpeg({ quality: 90 }).toFile(newPath);
          fs.unlinkSync(oldPath);
          
          req.file.path = newPath;
          req.file.filename = path.basename(newPath);
          req.file.mimetype = 'image/jpeg';
          
          console.log('✅ HEIC convertido a JPEG:', newPath);
        } catch (error) {
          console.error('❌ Error convirtiendo HEIC a JPEG:', error);
          return next(new Error('Error convirtiendo HEIC a JPEG'));
        }
      }

      // Crear thumbnails para imágenes
      try {
        await createImageThumbnails(req.file);
      } catch (error) {
        console.error('❌ Error creando thumbnails:', error);
        // No bloqueamos el upload por error en thumbnails
      }
    } else {
      console.log('📁 No se recibió imagen');
    }

    next();
  });
};

// Middleware para subida múltiple de imágenes
export const uploadMultipleImages = (req: Request, res: Response, next: NextFunction) => {
  console.log('🖼️ Iniciando upload múltiple de imágenes...');
  
  const uploadMiddleware = uploadImage.array('files', 10);
  
  uploadMiddleware(req, res, async (err: any) => {
    if (err) {
      console.error('❌ Error en upload múltiple de imágenes:', err.message);
      return next(err);
    }

    console.log('📁 Imágenes procesadas:', req.files ? 
      (req.files as Express.Multer.File[]).map(f => ({
        filename: f.filename,
        originalname: f.originalname,
        mimetype: f.mimetype,
        size: f.size
      })) : 'No files'
    );

    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files as Express.Multer.File[]) {
        // Convertir HEIC a JPEG si es necesario
        if (file.mimetype === 'image/heic') {
          console.log('🔄 Convirtiendo HEIC a JPEG:', file.filename);
          const oldPath = file.path;
          const newPath = oldPath.replace(/\.heic$/i, '.jpg');
          try {
            await sharp(oldPath).jpeg({ quality: 90 }).toFile(newPath);
            fs.unlinkSync(oldPath);
            
            file.path = newPath;
            file.filename = path.basename(newPath);
            file.mimetype = 'image/jpeg';
            
            console.log('✅ HEIC convertido a JPEG:', newPath);
          } catch (error) {
            console.error('❌ Error convirtiendo HEIC a JPEG:', error);
            // Continuar con el siguiente archivo
          }
        }

        // Crear thumbnails
        try {
          await createImageThumbnails(file);
        } catch (error) {
          console.error('❌ Error creando thumbnails para:', file.filename, error);
        }
      }
    }

    next();
  });
};

// Middleware para subida única de videos
export const uploadSingleVideo = (req: Request, res: Response, next: NextFunction) => {
  console.log('🎬 Iniciando upload de video...');
  
  const uploadMiddleware = uploadVideo.single('file');
  
  uploadMiddleware(req, res, (err: any) => {
    if (err) {
      console.error('❌ Error en upload de video:', err.message);
      return next(err);
    }

    console.log('📹 Video procesado:', req.file ? {
      filename: req.file.filename,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      destination: req.file.destination
    } : 'No file');

    next();
  });
};

// Middleware para subida múltiple de videos
export const uploadMultipleVideos = (req: Request, res: Response, next: NextFunction) => {
  console.log('🎬 Iniciando upload múltiple de videos...');
  
  const uploadMiddleware = uploadVideo.array('files', 5);
  
  uploadMiddleware(req, res, (err: any) => {
    if (err) {
      console.error('❌ Error en upload múltiple de videos:', err.message);
      return next(err);
    }

    console.log('📹 Videos procesados:', req.files ? 
      (req.files as Express.Multer.File[]).map(f => ({
        filename: f.filename,
        originalname: f.originalname,
        mimetype: f.mimetype,
        size: f.size,
        path: f.path
      })) : 'No files'
    );

    next();
  });
};

// Función para crear thumbnails de imágenes
const createImageThumbnails = async (file: Express.Multer.File): Promise<void> => {
  if (!file.mimetype.startsWith('image/')) return;

  const fileDir = path.dirname(file.path);
  const fileName = path.basename(file.path, path.extname(file.path));
  
  // Crear directorio de thumbnails si no existe
  const thumbnailsDir = path.join(fileDir, 'thumbnails');
  if (!fs.existsSync(thumbnailsDir)) {
    fs.mkdirSync(thumbnailsDir, { recursive: true });
  }

  // Crear thumbnail (300x300)
  const thumbnailPath = path.join(thumbnailsDir, `${fileName}-thumb.jpg`);
  await sharp(file.path)
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
  await sharp(file.path)
    .resize(800, 600, {
      fit: 'inside',
      withoutEnlargement: true
    })
    .jpeg({ quality: 85 })
    .toFile(mediumPath);

  // Agregar paths al objeto file
  (file as any).thumbnailPath = thumbnailPath;
  (file as any).mediumPath = mediumPath;

  console.log('✅ Thumbnails creados:', { thumbnailPath, mediumPath });
};

// Función helper para crear directorios de usuario
export const createUserDirectories = (userId: number): void => {
  const basePath = path.join(process.cwd(), 'uploads', userId.toString());
  const directories = [
    path.join(basePath, 'images'),
    path.join(basePath, 'images', 'thumbnails'),
    path.join(basePath, 'images', 'medium'),
    path.join(basePath, 'videos')
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
      const isVideo = error.message.includes('video');
      const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
      return res.status(413).json({
        success: false,
        error: `El archivo es demasiado grande. Tamaño máximo: ${maxSize / 1024 / 1024}MB`
      });
    }
    
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        error: 'Demasiados archivos enviados'
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

// Exportaciones por defecto (para compatibilidad)
export const uploadSingle = uploadSingleImage;
export const uploadMultiple = uploadMultipleImages;

export default uploadImage;