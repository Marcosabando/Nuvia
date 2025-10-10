// src/middleware/upload.ts
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

    const uploadPath = path.join('uploads', userId.toString());

    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }

    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4();
    const extension = path.extname(file.originalname).toLowerCase();
    const filename = `${Date.now()}-${uniqueId}${extension}`;
    cb(null, filename);
  }
});

// Filtro de archivos
const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
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

// Middleware para subida única
export const uploadSingle = (fieldName: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const middleware = upload.single(fieldName);
    middleware(req, res, async (err: any) => {
      if (err) return next(err);

      // Convertir HEIC a JPEG si es necesario
      if (req.file && req.file.mimetype === 'image/heic') {
        const oldPath = req.file.path;
        const newPath = oldPath.replace(/\.heic$/i, '.jpg');

        try {
          await sharp(oldPath).jpeg().toFile(newPath);
          fs.unlinkSync(oldPath); // eliminar HEIC original
          req.file.path = newPath;
          req.file.filename = path.basename(newPath);
        } catch (error) {
          return next(new Error('Error convirtiendo HEIC a JPEG'));
        }
      }

      next();
    });
  };
};

// Middleware para subida múltiple
export const uploadMultiple = (fieldName: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const middleware = upload.array(fieldName, 10);
    middleware(req, res, async (err: any) => {
      if (err) return next(err);

      if (req.files && Array.isArray(req.files)) {
        for (const file of req.files as Express.Multer.File[]) {
          if (file.mimetype === 'image/heic') {
            const oldPath = file.path;
            const newPath = oldPath.replace(/\.heic$/i, '.jpg');
            try {
              await sharp(oldPath).jpeg().toFile(newPath);
              fs.unlinkSync(oldPath);
              file.path = newPath;
              file.filename = path.basename(newPath);
            } catch (error) {
              return next(new Error('Error convirtiendo HEIC a JPEG'));
            }
          }
        }
      }

      next();
    });
  };
};

// Función helper para crear directorios de usuario
export const createUserDirectories = (userId: number): void => {
  const basePath = path.join('uploads');
  const directories = [
    path.join(basePath, userId.toString()),
    path.join(basePath, 'thumbnails', userId.toString()),
    path.join(basePath, 'medium', userId.toString())
  ];

  directories.forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });
};

// Función para limpiar archivos temporales
export const cleanTempFiles = (files: Express.Multer.File[]): void => {
  files.forEach(file => {
    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
  });
};

export default upload;
