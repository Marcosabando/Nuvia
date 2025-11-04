import dotenv from 'dotenv';
import { NodeEnvs } from './index';

// Cargar variables de entorno
dotenv.config();

export default {
  NodeEnv: (process.env.NODE_ENV ?? NodeEnvs.Dev),
  Port: (process.env.PORT ?? 3000),
  
  // Base de datos
  DbHost: process.env.DB_HOST ?? 'localhost',
  DbPort: parseInt(process.env.DB_PORT ?? '3306'),
  DbUser: process.env.DB_USER ?? 'root',
  DbPassword: process.env.DB_PASSWORD ?? '',
  DbName: process.env.DB_NAME ?? 'photo_management_system',
  
  // JWT
  JwtSecret: process.env.JWT_SECRET ?? 'your-secret-key',
  JwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '24h',
  JwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? 'your-refresh-secret',
  
  // CORS
  AllowedOrigins: process.env.ALLOWED_ORIGINS ?? 'http://localhost:3000',
  
  // Rate Limiting
  RateLimitWindowMs: process.env.RATE_LIMIT_WINDOW_MS ?? '900000',
  RateLimitMaxRequests: process.env.RATE_LIMIT_MAX_REQUESTS ?? '100',
  
  // Email
  EmailHost: process.env.EMAIL_HOST,
  EmailPort: process.env.EMAIL_PORT ?? '587',
  EmailUser: process.env.EMAIL_USER,
  EmailPassword: process.env.EMAIL_PASSWORD,
  EmailFrom: process.env.EMAIL_FROM,
  
  // Storage
  UploadPath: process.env.UPLOAD_PATH ?? './uploads',
  MaxFileSize: process.env.MAX_FILE_SIZE ?? '52428800',
  StorageLimit: process.env.STORAGE_LIMIT_DEFAULT ?? '5368709120',
} as const;