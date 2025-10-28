import { Router, Request, Response } from 'express';
import { authenticate as authenticateToken } from '@src/middleware/auth';
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

// 📊 GET /api/stats - estadísticas generales
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const authReq = req as AuthRequest;
    const userId = authReq.user?.userId;
    if (!userId) {
      return res.status(HttpStatusCodes.UNAUTHORIZED).json({
        success: false,
        error: 'Usuario no autenticado'
      });
    }

    logger.info(`📈 Obteniendo estadísticas para usuario ${userId}`);

    // Total de imágenes (excluyendo eliminadas)
    const [totalImagesResult] = await pool.query<any[]>(
      'SELECT COUNT(*) as total FROM imagenes WHERE user_id = ? AND deleted_at IS NULL',
      [userId]
    );
    const totalImages = totalImagesResult[0]?.total || 0;

    // Subidas hoy
    const [todayUploadsResult] = await pool.query<any[]>(
      `SELECT COUNT(*) as total 
       FROM imagenes 
       WHERE user_id = ? 
       AND DATE(upload_date) = CURDATE()
       AND deleted_at IS NULL`,
      [userId]
    );
    const todayUploads = todayUploadsResult[0]?.total || 0;

    // Uso de almacenamiento
    const [storageResult] = await pool.query<any[]>(
      'SELECT storage_used, storage_limit FROM usuarios WHERE id = ?',
      [userId]
    );
    const storageUsed = storageResult[0]?.storage_used || 0;
    const storageLimit = storageResult[0]?.storage_limit || 5368709120; // 5 GB por defecto

    // Total de vídeos
    const [totalVideosResult] = await pool.query<any[]>(
      `SELECT COUNT(*) as total 
       FROM imagenes 
       WHERE user_id = ? 
       AND mime_type LIKE 'video/%'
       AND deleted_at IS NULL`,
      [userId]
    );
    const totalVideos = totalVideosResult[0]?.total || 0;

    // Solo imágenes (no vídeos)
    const [totalImagesOnlyResult] = await pool.query<any[]>(
      `SELECT COUNT(*) as total 
       FROM imagenes 
       WHERE user_id = ? 
       AND mime_type LIKE 'image/%'
       AND deleted_at IS NULL`,
      [userId]
    );
    const totalImagesOnly = totalImagesOnlyResult[0]?.total || 0;

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
        todayUploads,
        storageUsed: storageUsedGB,
        storageLimit: storageLimitGB,
        storagePercentage,
        totalVideos
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

export default router;
