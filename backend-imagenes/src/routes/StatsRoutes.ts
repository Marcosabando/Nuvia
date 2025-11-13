import { Router, Request, Response, NextFunction } from 'express';
import authenticateToken from '@src/middleware/auth';
import { pool } from '@src/config/database';
import HttpStatusCodes from '@src/common/constants/HttpStatusCodes';
import logger from 'jet-logger';

const router = Router();

interface AuthRequest extends Request {
  user?: {
    userId: number;
    email: string;
    username: string;
  };
}

// Middleware para verificar autenticación
const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const authReq = req as AuthRequest;
  if (!authReq.user?.userId) {
    return res.status(HttpStatusCodes.UNAUTHORIZED).json({
      success: false,
      error: 'Usuario no autenticado'
    });
  }
  next();
};

// 📊 GET /api/stats - estadísticas generales
router.get('/', authenticateToken, requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user!.userId; // Ahora sabemos que existe gracias a requireAuth

    logger.info(`📈 Obteniendo estadísticas para usuario ${userId}`);

    // Ejecutar todas las consultas en paralelo para mejor performance
    const [
      totalImagesResult,
      todayUploadsResult,
      storageResult,
      totalVideosResult,
      totalImagesOnlyResult
    ] = await Promise.all([
      // Total de imágenes (excluyendo eliminadas)
      pool.query<any[]>(
        'SELECT COUNT(*) as total FROM imagenes WHERE user_id = ? AND deleted_at IS NULL',
        [userId]
      ),
      // Subidas hoy
      pool.query<any[]>(
        `SELECT COUNT(*) as total 
         FROM imagenes 
         WHERE user_id = ? 
         AND DATE(upload_date) = CURDATE()
         AND deleted_at IS NULL`,
        [userId]
      ),
      // Uso de almacenamiento
      pool.query<any[]>(
        'SELECT storage_used, storage_limit FROM usuarios WHERE id = ?',
        [userId]
      ),
      // Total de vídeos
      pool.query<any[]>(
        `SELECT COUNT(*) as total 
         FROM imagenes 
         WHERE user_id = ? 
         AND mime_type LIKE 'video/%'
         AND deleted_at IS NULL`,
        [userId]
      ),
      // Solo imágenes (no vídeos)
      pool.query<any[]>(
        `SELECT COUNT(*) as total 
         FROM imagenes 
         WHERE user_id = ? 
         AND mime_type LIKE 'image/%'
         AND deleted_at IS NULL`,
        [userId]
      )
    ]);

    // Extraer resultados
    const totalImages = totalImagesResult[0][0]?.total || 0;
    const todayUploads = todayUploadsResult[0][0]?.total || 0;
    const storageUsed = storageResult[0][0]?.storage_used || 0;
    const storageLimit = storageResult[0][0]?.storage_limit || 5368709120; // 5 GB por defecto
    const totalVideos = totalVideosResult[0][0]?.total || 0;
    const totalImagesOnly = totalImagesOnlyResult[0][0]?.total || 0;

    // Conversión de bytes a GB
    const storageUsedGB = parseFloat((storageUsed / (1024 ** 3)).toFixed(2));
    const storageLimitGB = parseFloat((storageLimit / (1024 ** 3)).toFixed(2));
    const storagePercentage = storageLimit > 0
      ? parseFloat(((storageUsed / storageLimit) * 100).toFixed(1))
      : 0;

    res.json({
      success: true,
      data: {
        totalImages,
        totalImagesOnly,
        totalVideos,
        todayUploads,
        storage: {
          used: storageUsedGB,
          limit: storageLimitGB,
          percentage: storagePercentage,
          usedBytes: storageUsed,
          limitBytes: storageLimit
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.err('❌ Error obteniendo estadísticas:', error);
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Error al obtener estadísticas',
      message: error.message
    });
  }
});

// 📊 GET /api/stats/recent - actividad reciente (últimos 7 días)
router.get('/recent', authenticateToken, requireAuth, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user!.userId;

    const [recentActivity] = await pool.query<any[]>(
      `SELECT 
         DATE(upload_date) as date,
         COUNT(*) as count,
         SUM(file_size) as totalSize
       FROM imagenes 
       WHERE user_id = ? 
       AND upload_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
       AND deleted_at IS NULL
       GROUP BY DATE(upload_date)
       ORDER BY date DESC`,
      [userId]
    );

    res.json({
      success: true,
      data: recentActivity,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    logger.err('❌ Error obteniendo actividad reciente:', error);
    res.status(HttpStatusCodes.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Error al obtener actividad reciente',
      message: error.message
    });
  }
});

export default router;