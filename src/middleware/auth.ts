import { Request, Response, NextFunction } from 'express';
import { verifyToken, JWTPayload } from '../config/jwt';

// Extender la interfaz Request para incluir user
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

export interface AuthenticatedRequest extends Request {
  user: JWTPayload;
}

// Middleware principal de autenticación
export const authenticate = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Obtener el token del header Authorization
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      res.status(401).json({
        success: false,
        message: 'Token de acceso requerido'
      });
      return;
    }

    // Verificar que el header tenga el formato correcto "Bearer token"
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : authHeader;

    if (!token) {
      res.status(401).json({
        success: false,
        message: 'Formato de token inválido'
      });
      return;
    }

    // Verificar el token
    const payload = verifyToken(token);
    
    if (!payload) {
      res.status(401).json({
        success: false,
        message: 'Token inválido o expirado'
      });
      return;
    }

    // Agregar la información del usuario al request
    req.user = payload;
    next();
    
  } catch (error) {
    console.error('Error en middleware de autenticación:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor'
    });
  }
};

// Middleware opcional - solo verifica si hay token válido, pero no falla si no hay
export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader) {
      const token = authHeader.startsWith('Bearer ') 
        ? authHeader.slice(7) 
        : authHeader;

      if (token) {
        const payload = verifyToken(token);
        if (payload) {
          req.user = payload;
        }
      }
    }
    
    next();
  } catch (error) {
    // En caso de error, simplemente continúa sin usuario
    next();
  }
};

// Middleware para verificar roles específicos (si los implementas más adelante)
export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: 'Autenticación requerida'
      });
      return;
    }

    // Aquí podrías verificar roles si los tienes en el payload
    // const userRole = req.user.role;
    // if (!roles.includes(userRole)) {
    //   res.status(403).json({
    //     success: false,
    //     message: 'No tienes permisos suficientes'
    //   });
    //   return;
    // }

    next();
  };
};

// Middleware para verificar que el usuario sea el propietario del recurso
export const requireOwnership = (req: Request, res: Response, next: NextFunction): void => {
  const userId = req.user?.userId;
  const resourceUserId = parseInt(req.params.userId) || parseInt(req.body.userId);

  if (!userId) {
    res.status(401).json({
      success: false,
      message: 'Autenticación requerida'
    });
    return;
  }

  if (userId !== resourceUserId) {
    res.status(403).json({
      success: false,
      message: 'No tienes permisos para acceder a este recurso'
    });
    return;
  }

  next();
};

export default authenticate;