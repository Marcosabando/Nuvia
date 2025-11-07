// src/routes/auth.ts
import { Router, Request, Response } from 'express';
import { generateToken, JWTPayload } from '../config/jwt';

const router = Router();

/**
 * POST /api/auth/login-test
 * Genera un JWT de prueba para Postman
 * Body esperado: { userId: number, email: string, username: string }
 */
router.post('/login-test', (req: Request, res: Response) => {
  const { userId, email, username } = req.body || {};

  if (!userId || !email || !username) {
    return res.status(400).json({
      success: false,
      message: 'Se requiere userId, email y username en el body'
    });
  }

  const payload: JWTPayload = { userId, email, username };
  const token = generateToken(payload);

  res.json({
    success: true,
    token,
    expiresIn: '24h',
    user: payload
  });
});

export default router;

