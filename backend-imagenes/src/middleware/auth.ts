// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { verifyToken, JWTPayload } from '@src/config/jwt';

export default function auth(req: Request, res: Response, next: NextFunction) {
  try {
    // 1. Obtener token del header
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({
        success: false,
        message: 'No se proporcionó token de autenticación'
      });
    }

    // 2. Extraer token (quitar "Bearer " si existe)
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : authHeader;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Token vacío'
      });
    }

    // 3. Verificar token - ⚠️ CRÍTICO: verifyToken retorna null si falla
    const decoded = verifyToken(token);
    
    if (!decoded) {
      return res.status(401).json({
        success: false,
        message: 'Token inválido o expirado'
      });
    }

    // 4. Agregar usuario al request
    req.user = decoded;
    
    next();
  } catch (error) {
    console.error('❌ Error en middleware auth:', error);
    return res.status(401).json({
      success: false,
      message: 'Error al verificar token',
      error: error instanceof Error ? error.message : 'Error desconocido'
    });
  }
}