// src/routes/UserRoutes.ts
import { Router } from 'express';
import { 
  registerUser, 
  loginUser, 
  getProfile, 
  updateProfile, 
  changePassword, 
  deleteAccount 
} from '@src/services/UserService';
import { authenticate } from '@src/middleware/auth';

const router = Router();

// Rutas públicas
router.post('/register', registerUser);
router.post('/login', loginUser);

// Rutas protegidas (requieren autenticación)
router.use(authenticate); // Middleware aplicado a todas las rutas siguientes

router.get('/profile', getProfile);
router.put('/profile', updateProfile);
router.put('/change-password', changePassword);
router.delete('/account', deleteAccount);

export default router;