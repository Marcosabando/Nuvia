import { Request, Response, NextFunction } from 'express';
import multer from 'multer';

// Interfaz para errores personalizados
export interface AppError extends Error {
  statusCode?: number;
  status?: string;
  isOperational?: boolean;
}

// Crear un error personalizado
export const createError = (message: string, statusCode: number): AppError => {
  const error: AppError = new Error(message);
  error.statusCode = statusCode;
  error.status = statusCode >= 400 && statusCode < 500 ? 'fail' : 'error';
  error.isOperational = true;
  
  return error;
};

// Middleware para manejar errores de Multer
export const handleMulterError = (err: any, req: Request, res: Response, next: NextFunction): void => {
  if (err instanceof multer.MulterError) {
    let message = 'Error en la subida de archivo';
    let statusCode = 400;

    switch (err.code) {
      case 'LIMIT_FILE_SIZE':
        message = 'El archivo es demasiado grande. Máximo 50MB permitido';
        break;
      case 'LIMIT_FILE_COUNT':
        message = 'Demasiados archivos. Máximo 10 archivos permitidos';
        break;
      case 'LIMIT_UNEXPECTED_FILE':
        message = 'Campo de archivo inesperado';
        break;
      case 'LIMIT_PART_COUNT':
        message = 'Demasiadas partes en el formulario';
        break;
      case 'LIMIT_FIELD_KEY':
        message = 'Nombre de campo demasiado largo';
        break;
      case 'LIMIT_FIELD_VALUE':
        message = 'Valor de campo demasiado largo';
        break;
      case 'LIMIT_FIELD_COUNT':
        message = 'Demasiados campos en el formulario';
        break;
      case 'MISSING_FIELD_NAME':
        message = 'Nombre de campo faltante';
        break;
      default:
        message = err.message || 'Error en la subida de archivo';
    }

    res.status(statusCode).json({
      success: false,
      message,
      error: process.env.NODE_ENV === 'development' ? err : undefined
    });
    return;
  }

  // Si no es un error de Multer, pasar al siguiente middleware
  next(err);
};

// Middleware principal de manejo de errores
export const errorHandler = (err: AppError, req: Request, res: Response, next: NextFunction): void => {
  let { statusCode = 500, message } = err;

  // Error de JSON malformado
  if (err.name === 'SyntaxError' && 'body' in err) {
    statusCode = 400;
    message = 'JSON malformado en el cuerpo de la petición';
  }

  // Error de validación
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Error de validación de datos';
  }

  // Error de JWT
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Token JWT inválido';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token JWT expirado';
  }

  // Error de base de datos (puedes personalizar según tu ORM)
  if (err.name === 'SequelizeValidationError' || err.name === 'MongoError') {
    statusCode = 400;
    message = 'Error de validación en la base de datos';
  }

  // Log del error en desarrollo
  if (process.env.NODE_ENV === 'development') {
    console.error('Error:', {
      message: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
      timestamp: new Date().toISOString()
    });
  }

  // Respuesta al cliente
  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      error: err
    })
  });
};

// Middleware para rutas no encontradas
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    message: `Ruta ${req.originalUrl} no encontrada`
  });
};

// Middleware para manejar errores asíncronos
export const asyncHandler = <T extends Request, U extends Response>(
  fn: (req: T, res: U, next: NextFunction) => Promise<any>
) => (req: T, res: U, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};