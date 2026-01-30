// src/routes/UserRoutes.ts
import { Router, Request, Response, NextFunction } from 'express';
import { 
  registerUser, 
  loginUser, 
  getProfile, 
  updateProfile, 
  changePassword, 
  deleteAccount 
} from '@src/types/UserService';
import authenticate from '@src/middleware/auth';
import logger from 'jet-logger';

const router = Router();

// Wrapper para manejar errores async en rutas
const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

/******************************************************
 * RUTAS PÚBLICAS (Sin autenticación)
 ******************************************************/

// 📝 POST /api/users/register - Registrar nuevo usuario
router.post('/register', asyncHandler(async (req: Request, res: Response) => {
  logger.info('📝 Solicitud de registro recibida');
  await registerUser(req, res);
}));

// 🔐 POST /api/users/login - Iniciar sesión
router.post('/login', asyncHandler(async (req: Request, res: Response) => {
  logger.info('🔐 Solicitud de login recibida');
  await loginUser(req, res);
}));

/******************************************************
 * MIDDLEWARE DE AUTENTICACIÓN
 * Todas las rutas después de esta línea requieren token
 ******************************************************/
router.use(authenticate);

/******************************************************
 * RUTAS PROTEGIDAS (Requieren autenticación)
 ******************************************************/

// 👤 GET /api/users/profile - Obtener perfil del usuario actual
router.get('/profile', asyncHandler(async (req: Request, res: Response) => {
  logger.info('👤 Obteniendo perfil de usuario');
  await getProfile(req, res);
}));

// ✏️ PUT /api/users/profile - Actualizar perfil del usuario
router.put('/profile', asyncHandler(async (req: Request, res: Response) => {
  logger.info('✏️ Actualizando perfil de usuario');
  await updateProfile(req, res);
}));

// 🔑 PUT /api/users/change-password - Cambiar contraseña
router.put('/change-password', asyncHandler(async (req: Request, res: Response) => {
  logger.info('🔑 Cambiando contraseña de usuario');
  await changePassword(req, res);
}));

// 🗑️ DELETE /api/users/account - Eliminar cuenta (soft delete)
router.delete('/account', asyncHandler(async (req: Request, res: Response) => {
  logger.info('🗑️ Eliminando cuenta de usuario');
  await deleteAccount(req, res);
}));

/******************************************************
 * RUTAS ADICIONALES (Opcionales pero útiles)
 ******************************************************/

// 🚪 POST /api/users/logout - Cerrar sesión (opcional, para invalidar token en cliente)
router.post('/logout', (req: Request, res: Response) => {
  logger.info('🚪 Usuario cerrando sesión');
  res.json({
    success: true,
    message: 'Sesión cerrada correctamente'
  });
});

// ✅ GET /api/users/verify - Verificar si el token es válido
router.get('/verify', (req: Request, res: Response) => {
  // Si llega aquí, el token es válido (pasó por el middleware authenticate)
  const authReq = req as any;
  res.json({
    success: true,
    message: 'Token válido',
    user: {
      userId: authReq.user?.userId,
      email: authReq.user?.email,
      username: authReq.user?.username
    }
  });
});

export default router;