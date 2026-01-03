// src/middleware/auth.ts
import { Request, Response, NextFunction } from 'express';
import { verifyToken, JWTPayload } from '@src/config/jwt';

export default function auth(req: Request, res: Response, next: NextFunction) {
  try {
    // Permitir preflight CORS sin autenticación (el navegador no envía Authorization en OPTIONS)
    if (req.method === 'OPTIONS') {
      return next();
    }

    // 1. Obtener token del header
    const authHeader = req.headers.authorization;

    // Soportar token vía query param (útil para <iframe>/<embed> o librerías que no permiten headers)
    const queryToken = typeof req.query.token === 'string' ? req.query.token : undefined;

    const tokenFromHeader = authHeader
      ? (authHeader.startsWith('Bearer ') ? authHeader.substring(7) : authHeader)
      : undefined;

    const token = tokenFromHeader || queryToken;

    const shouldLog = req.path.includes('/documents/') || req.originalUrl.includes('/api/documents/');
    if (shouldLog) {
      console.log('[AUTH]', {
        method: req.method,
        url: req.originalUrl,
        path: req.path,
        origin: req.headers.origin,
        referer: req.headers.referer,
        host: req.headers.host,
        hasAuthHeader: Boolean(authHeader),
        hasQueryToken: Boolean(queryToken),
        tokenSource: tokenFromHeader ? 'header' : (queryToken ? 'query' : 'none'),
        secFetchDest: req.headers['sec-fetch-dest'],
        secFetchMode: req.headers['sec-fetch-mode'],
        secFetchSite: req.headers['sec-fetch-site'],
        userAgent: req.headers['user-agent'],
      });
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No se proporcionó token de autenticación'
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

    if (shouldLog) {
      console.log('[AUTH_OK]', { userId: decoded.userId, email: decoded.email, username: decoded.username });
    }
    
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