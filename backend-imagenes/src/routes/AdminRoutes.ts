// src/routes/AdminRoutes.ts
import { Router, Request, Response, NextFunction } from 'express';
import { 
  getAdminStats,
  getAllUsers,
  getUserDetails,
  toggleUserStatus,
  updateUserStorage,
  deleteUser,
  exportData,
  searchSystem,
  getSystemActivity
} from '@src/services/AdminService';
import authenticate from '@src/middleware/auth';
import logger from 'jet-logger';

const router = Router();

// Wrapper para manejar errores async en rutas
const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/******************************************************
 * MIDDLEWARE DE AUTENTICACIÓN
 * Todas las rutas requieren autenticación
 ******************************************************/
router.use(authenticate);

/******************************************************
 * MIDDLEWARE DE VERIFICACIÓN DE ADMIN
 * Verificar que el usuario tenga rol de administrador
 ******************************************************/
const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
  const user = (req as any).user;
  
  if (!user || user.role !== 'admin') {
    logger.warn(`❌ Acceso denegado a ruta de admin para usuario: ${user?.username || 'desconocido'}`);
    return res.status(403).json({
      success: false,
      error: 'Acceso denegado - Se requiere rol de administrador'
    });
  }
  
  logger.info(`✅ Usuario admin autenticado: ${user.username}`);
  next();
};

router.use(requireAdmin);

/******************************************************
 * RUTAS DE ESTADÍSTICAS
 ******************************************************/

/**
 * 📊 GET /api/admin/stats - Obtener estadísticas globales del sistema
 */
router.get('/stats', asyncHandler(async (req: Request, res: Response) => {
  logger.info('📊 Obteniendo estadísticas del sistema');
  await getAdminStats(req, res);
}));

/**
 * 📈 GET /api/admin/activity - Obtener actividad reciente del sistema
 */
router.get('/activity', asyncHandler(async (req: Request, res: Response) => {
  logger.info('📈 Obteniendo actividad del sistema');
  await getSystemActivity(req, res);
}));

/******************************************************
 * RUTAS DE GESTIÓN DE USUARIOS
 ******************************************************/

/**
 * 👥 GET /api/admin/users - Obtener lista de todos los usuarios
 * Query params: page, limit, search
 */
router.get('/users', asyncHandler(async (req: Request, res: Response) => {
  logger.info('👥 Obteniendo lista de usuarios');
  await getAllUsers(req, res);
}));

/**
 * 👤 GET /api/admin/users/:id - Obtener detalles de un usuario específico
 */
router.get('/users/:id', asyncHandler(async (req: Request, res: Response) => {
  logger.info(`👤 Obteniendo detalles del usuario ${req.params.id}`);
  await getUserDetails(req, res);
}));

/**
 * 🔄 POST /api/admin/users/:id/suspend - Suspender/Activar un usuario
 */
router.post('/users/:id/suspend', asyncHandler(async (req: Request, res: Response) => {
  logger.info(`🔄 Cambiando estado del usuario ${req.params.id}`);
  await toggleUserStatus(req, res);
}));

/**
 * 💾 PUT /api/admin/users/:id/storage - Actualizar límite de almacenamiento
 */
router.put('/users/:id/storage', asyncHandler(async (req: Request, res: Response) => {
  logger.info(`💾 Actualizando almacenamiento del usuario ${req.params.id}`);
  await updateUserStorage(req, res);
}));

/**
 * 🗑️ DELETE /api/admin/users/:id - Eliminar un usuario (soft delete)
 */
router.delete('/users/:id', asyncHandler(async (req: Request, res: Response) => {
  logger.warn(`🗑️ Eliminando usuario ${req.params.id}`);
  await deleteUser(req, res);
}));

/******************************************************
 * RUTAS DE BÚSQUEDA Y EXPORTACIÓN
 ******************************************************/

/**
 * 🔍 GET /api/admin/search - Buscar en el sistema
 * Query params: q (búsqueda), type (users|images|videos)
 */
router.get('/search', asyncHandler(async (req: Request, res: Response) => {
  logger.info(`🔍 Búsqueda en el sistema: ${req.query.q}`);
  await searchSystem(req, res);
}));

/**
 * 📥 GET /api/admin/export - Exportar datos del sistema a CSV
 */
router.get('/export', asyncHandler(async (req: Request, res: Response) => {
  logger.info('📥 Exportando datos del sistema');
  await exportData(req, res);
}));

/******************************************************
 * RUTA DE VERIFICACIÓN DE ADMIN
 ******************************************************/

/**
 * ✅ GET /api/admin/verify - Verificar permisos de administrador
 */
router.get('/verify', (req: Request, res: Response) => {
  const user = (req as any).user;
  logger.info(`✅ Verificación de admin para: ${user.username}`);
  
  res.json({
    success: true,
    message: 'Permisos de administrador verificados',
    admin: {
      userId: user.userId,
      username: user.username,
      email: user.email,
      role: user.role
    }
  });
});

/******************************************************
 * MANEJO DE ERRORES ESPECÍFICO PARA RUTAS DE ADMIN
 ******************************************************/
router.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  logger.err(`❌ Error en rutas de administrador: ${error.stack}`);
  
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor',
    message: error.message
  });
});

export default router;