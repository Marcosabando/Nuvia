// src/middleware/multer.ts - VERSIÓN ACTUALIZADA CON DOCUMENTOS
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import sharp from 'sharp';
import { Request, Response, NextFunction } from 'express';

// Tipos MIME permitidos - ACTUALIZADO CON DOCUMENTOS
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
  'video/x-matroska',

  // Documentos - NUEVOS TIPOS
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'text/plain',
  'text/csv',
  'application/rtf',
  'application/zip',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
  'application/x-tar',
  'application/gzip',
  'application/json',
  'application/xml',
  'text/html',
  'text/css',
  'application/javascript',
  'text/markdown'
];

// Tamaños máximos - ACTUALIZADO CON DOCUMENTOS
export const MAX_IMAGE_SIZE = 50 * 1024 * 1024; // 50MB para imágenes
export const MAX_VIDEO_SIZE = 2 * 1024 * 1024 * 1024; // 2GB para videos
export const MAX_DOCUMENT_SIZE = 100 * 1024 * 1024; // 100MB para documentos

// Interface extendida para Request con user
interface AuthRequest extends Request {
  user?: {
    userId: number;
    email: string;
    username: string;
  };
}

// ✅ CONFIGURACIÓN CORREGIDA: Estructura por usuario con subcarpetas - ACTUALIZADO CON DOCUMENTOS
const getStorage = (fileType: 'image' | 'video' | 'profile' | 'document') => {
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

      // ✅ ESTRUCTURA CORREGIDA: 
      // - uploads/userId/images/
      // - uploads/userId/videos/  
      // - uploads/userId/profile/
      // - uploads/userId/documents/  ← NUEVA CARPETA PARA DOCUMENTOS
      const userDir = path.join(uploadsDir, userId.toString());
      
      let typeDir: string;
      switch (fileType) {
        case 'profile':
          typeDir = path.join(userDir, 'profile');
          break;
        case 'document':
          typeDir = path.join(userDir, 'documents');
          break;
        default:
          typeDir = path.join(userDir, fileType === 'image' ? 'images' : 'videos');
      }

      // Crear directorios recursivamente
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

// ✅ CONFIGURACIÓN PARA DOCUMENTOS - NUEVA CONFIGURACIÓN
export const uploadDocument = multer({
  storage: getStorage('document'),
  fileFilter: (req, file, cb) => {
    const documentMimeTypes = [
      // PDF
      'application/pdf',
      
      // Word
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      
      // Excel
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      
      // PowerPoint
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      
      // Texto
      'text/plain',
      'text/csv',
      'text/markdown',
      
      // Otros documentos
      'application/rtf',
      'application/json',
      'application/xml',
      'text/html',
      'text/css',
      'application/javascript',
      
      // Archivos comprimidos
      'application/zip',
      'application/x-rar-compressed',
      'application/x-7z-compressed',
      'application/x-tar',
      'application/gzip'
    ];

    if (documentMimeTypes.includes(file.mimetype)) {
      console.log('✅ Documento aceptado:', file.mimetype);
      cb(null, true);
    } else {
      console.log('❌ Tipo de documento no permitido:', file.mimetype);
      cb(new Error(`Tipo de documento no permitido: ${file.mimetype}`));
    }
  },
  limits: {
    fileSize: MAX_DOCUMENT_SIZE,
    files: 10 // Máximo 10 documentos a la vez
  }
});

// ✅ CONFIGURACIÓN PARA IMÁGENES DE PERFIL
export const uploadProfileImage = multer({
  storage: getStorage('profile'),
  fileFilter: (req, file, cb) => {
    const imageMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/heic'
    ];

    if (imageMimeTypes.includes(file.mimetype)) {
      console.log('✅ Imagen de perfil aceptada:', file.mimetype);
      cb(null, true);
    } else {
      console.log('❌ Tipo de imagen de perfil no permitido:', file.mimetype);
      cb(new Error(`Tipo de imagen de perfil no permitido: ${file.mimetype}`));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB máximo para imágenes de perfil
    files: 1 // Solo una imagen de perfil a la vez
  }
});

// ✅ CONFIGURACIÓN PARA IMÁGENES NORMALES
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
    files: 5
  }
});

// ✅ MIDDLEWARE PARA SUBIDA ÚNICA DE DOCUMENTOS - NUEVO MIDDLEWARE
export const uploadSingleDocument = (req: Request, res: Response, next: NextFunction) => {
  console.log('📄 Iniciando upload de documento...');
  
  const uploadMiddleware = uploadDocument.single('document');
  
  uploadMiddleware(req, res, async (err: any) => {
    if (err) {
      console.error('❌ Error en upload de documento:', err.message);
      return next(err);
    }

    if (req.file) {
      console.log('📁 Documento procesado:', {
        filename: req.file.filename,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path,
        destination: req.file.destination
      });

      // Extraer información adicional del documento si es posible
      try {
        await extractDocumentInfo(req.file);
      } catch (error) {
        console.error('❌ Error extrayendo información del documento:', error);
        // No bloqueamos el upload por error en extracción de metadatos
      }
    } else {
      console.log('📁 No se recibió documento');
    }

    next();
  });
};

// ✅ MIDDLEWARE PARA SUBIDA MÚLTIPLE DE DOCUMENTOS - NUEVO MIDDLEWARE
export const uploadMultipleDocuments = (req: Request, res: Response, next: NextFunction) => {
  console.log('📄 Iniciando upload múltiple de documentos...');
  
  const uploadMiddleware = uploadDocument.array('documents', 10);
  
  uploadMiddleware(req, res, async (err: any) => {
    if (err) {
      console.error('❌ Error en upload múltiple de documentos:', err.message);
      return next(err);
    }

    console.log('📁 Documentos procesados:', req.files ? 
      (req.files as Express.Multer.File[]).map(f => ({
        filename: f.filename,
        originalname: f.originalname,
        mimetype: f.mimetype,
        size: f.size
      })) : 'No files'
    );

    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files as Express.Multer.File[]) {
        try {
          await extractDocumentInfo(file);
        } catch (error) {
          console.error('❌ Error extrayendo información del documento:', file.filename, error);
        }
      }
    }

    next();
  });
};

// ✅ MIDDLEWARE ESPECÍFICO PARA IMÁGENES DE PERFIL
export const uploadSingleProfileImage = (req: Request, res: Response, next: NextFunction) => {
  console.log('🖼️ Iniciando upload de imagen de perfil...');
  
  const uploadMiddleware = uploadProfileImage.single('profileImage');
  
  uploadMiddleware(req, res, async (err: any) => {
    if (err) {
      console.error('❌ Error en upload de imagen de perfil:', err.message);
      return next(err);
    }

    if (req.file) {
      console.log('📁 Imagen de perfil procesada:', {
        filename: req.file.filename,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path,
        destination: req.file.destination
      });

      // Convertir HEIC a JPEG si es necesario
      if (req.file.mimetype === 'image/heic') {
        console.log('🔄 Convirtiendo HEIC a JPEG para imagen de perfil...');
        const oldPath = req.file.path;
        const newPath = oldPath.replace(/\.heic$/i, '.jpg');

        try {
          await sharp(oldPath).jpeg({ quality: 90 }).toFile(newPath);
          fs.unlinkSync(oldPath);
          
          req.file.path = newPath;
          req.file.filename = path.basename(newPath);
          req.file.mimetype = 'image/jpeg';
          
          console.log('✅ HEIC convertido a JPEG para imagen de perfil:', newPath);
        } catch (error) {
          console.error('❌ Error convirtiendo HEIC a JPEG para imagen de perfil:', error);
          return next(new Error('Error convirtiendo HEIC a JPEG'));
        }
      }

      // Crear versiones optimizadas para imagen de perfil
      try {
        await createProfileImageVersions(req.file);
      } catch (error) {
        console.error('❌ Error creando versiones de imagen de perfil:', error);
        // No bloqueamos el upload por error en optimización
      }
    } else {
      console.log('📁 No se recibió imagen de perfil');
    }

    next();
  });
};

// Middleware para subida única de imágenes normales
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

// ✅ FUNCIÓN PARA EXTRAER INFORMACIÓN DE DOCUMENTOS - NUEVA FUNCIÓN
const extractDocumentInfo = async (file: Express.Multer.File): Promise<void> => {
  // Aquí puedes agregar lógica para extraer metadatos de documentos
  // Por ejemplo, usando bibliotecas como pdf-parse, mammoth, etc.
  
  const documentInfo: any = {
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    extension: path.extname(file.originalname).toLowerCase()
  };

  // Determinar categoría basada en MIME type
  if (file.mimetype.includes('word') || file.mimetype.includes('document')) {
    documentInfo.category = 'office';
  } else if (file.mimetype.includes('spreadsheet') || file.mimetype.includes('excel')) {
    documentInfo.category = 'office';
  } else if (file.mimetype.includes('presentation') || file.mimetype.includes('powerpoint')) {
    documentInfo.category = 'office';
  } else if (file.mimetype.includes('pdf')) {
    documentInfo.category = 'office';
  } else if (file.mimetype.includes('text')) {
    documentInfo.category = 'text';
  } else if (file.mimetype.includes('json') || file.mimetype.includes('xml') || 
             file.mimetype.includes('html') || file.mimetype.includes('css') ||
             file.mimetype.includes('javascript')) {
    documentInfo.category = 'code';
  } else if (file.mimetype.includes('zip') || file.mimetype.includes('rar') ||
             file.mimetype.includes('7z') || file.mimetype.includes('tar') ||
             file.mimetype.includes('gzip')) {
    documentInfo.category = 'archive';
  } else {
    documentInfo.category = 'other';
  }

  // Agregar información al objeto file
  (file as any).documentInfo = documentInfo;
  
  console.log('📊 Información del documento extraída:', documentInfo);
};

// ✅ FUNCIÓN PARA CREAR VERSIONES DE IMAGEN DE PERFIL
const createProfileImageVersions = async (file: Express.Multer.File): Promise<void> => {
  if (!file.mimetype.startsWith('image/')) return;

  const fileDir = path.dirname(file.path);
  const fileName = path.basename(file.path, path.extname(file.path));
  
  // Crear versión grande (500x500)
  const largePath = path.join(fileDir, `${fileName}-large.jpg`);
  await sharp(file.path)
    .resize(500, 500, {
      fit: 'cover',
      position: 'center'
    })
    .jpeg({ quality: 90 })
    .toFile(largePath);

  // Crear versión mediana (200x200)
  const mediumPath = path.join(fileDir, `${fileName}-medium.jpg`);
  await sharp(file.path)
    .resize(200, 200, {
      fit: 'cover',
      position: 'center'
    })
    .jpeg({ quality: 85 })
    .toFile(mediumPath);

  // Crear versión pequeña/thumbnail (80x80)
  const thumbPath = path.join(fileDir, `${fileName}-thumb.jpg`);
  await sharp(file.path)
    .resize(80, 80, {
      fit: 'cover',
      position: 'center'
    })
    .jpeg({ quality: 80 })
    .toFile(thumbPath);

  // Agregar paths al objeto file
  (file as any).largePath = largePath;
  (file as any).mediumPath = mediumPath;
  (file as any).thumbPath = thumbPath;

  console.log('✅ Versiones de imagen de perfil creadas:', { 
    largePath, 
    mediumPath, 
    thumbPath 
  });
};

// Función para crear thumbnails de imágenes normales
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

// ✅ FUNCIÓN HELPER PARA CREAR DIRECTORIOS DE USUARIO (ACTUALIZADO CON DOCUMENTOS)
export const createUserDirectories = (userId: number): void => {
  const basePath = path.join(process.cwd(), 'uploads', userId.toString());
  const directories = [
    path.join(basePath, 'images'),
    path.join(basePath, 'images', 'thumbnails'),
    path.join(basePath, 'images', 'medium'),
    path.join(basePath, 'videos'),
    path.join(basePath, 'profile'),
    path.join(basePath, 'documents') // ← NUEVO DIRECTORIO PARA DOCUMENTOS
  ];

  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log('📁 Directorio creado:', dir);
    }
  });
};

// ✅ FUNCIÓN PARA OBTENER LA RUTA PÚBLICA DE DOCUMENTOS - NUEVA FUNCIÓN
export const getDocumentPublicPath = (userId: number, filename: string): string => {
  return `/uploads/${userId}/documents/${filename}`;
};

// ✅ FUNCIÓN PARA OBTENER LA RUTA PÚBLICA DE LA IMAGEN DE PERFIL
export const getProfileImagePublicPath = (userId: number, filename: string): string => {
  return `/uploads/${userId}/profile/${filename}`;
};

// ✅ FUNCIÓN PARA ELIMINAR DOCUMENTOS ANTERIORES - NUEVA FUNCIÓN
export const cleanupOldDocuments = async (userId: number, keepFilenames?: string[]): Promise<void> => {
  try {
    const documentsDir = path.join(process.cwd(), 'uploads', userId.toString(), 'documents');
    
    if (!fs.existsSync(documentsDir)) {
      return;
    }

    const files = fs.readdirSync(documentsDir);
    const keepSet = new Set(keepFilenames || []);
    
    for (const file of files) {
      // No eliminar los archivos que queremos mantener
      if (keepSet.has(file)) {
        continue;
      }
      
      const filePath = path.join(documentsDir, file);
      try {
        fs.unlinkSync(filePath);
        console.log('🧹 Documento anterior eliminado:', filePath);
      } catch (error) {
        console.error('❌ Error eliminando documento anterior:', filePath, error);
      }
    }
  } catch (error) {
    console.error('❌ Error en limpieza de documentos:', error);
  }
};

// ✅ FUNCIÓN PARA ELIMINAR IMÁGENES DE PERFIL ANTERIORES
export const cleanupOldProfileImages = async (userId: number, keepFilename?: string): Promise<void> => {
  try {
    const profileDir = path.join(process.cwd(), 'uploads', userId.toString(), 'profile');
    
    if (!fs.existsSync(profileDir)) {
      return;
    }

    const files = fs.readdirSync(profileDir);
    
    for (const file of files) {
      // No eliminar el archivo que queremos mantener
      if (keepFilename && file === keepFilename) {
        continue;
      }
      
      const filePath = path.join(profileDir, file);
      try {
        fs.unlinkSync(filePath);
        console.log('🧹 Imagen de perfil anterior eliminada:', filePath);
      } catch (error) {
        console.error('❌ Error eliminando imagen de perfil anterior:', filePath, error);
      }
    }
  } catch (error) {
    console.error('❌ Error en limpieza de imágenes de perfil:', error);
  }
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

// Middleware de manejo de errores para upload - ACTUALIZADO CON DOCUMENTOS
export const handleUploadError = (error: any, req: Request, res: Response, next: NextFunction) => {
  console.error('💥 Error en middleware de upload:', error);

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      const isVideo = error.message.includes('video');
      const isProfile = error.message.includes('profile');
      const isDocument = error.message.includes('document');
      
      let maxSize: number;
      if (isProfile) {
        maxSize = 10 * 1024 * 1024; // 10MB para perfil
      } else if (isDocument) {
        maxSize = MAX_DOCUMENT_SIZE;
      } else {
        maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
      }
      
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