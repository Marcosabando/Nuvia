import express, { Request, Response, NextFunction } from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import logger from 'jet-logger';

// Importaciones propias
import ENV from '@src/common/constants/ENV';
import { NodeEnvs } from '@src/common/constants';

// Rutas
import authRouter from './routes/auth';
import userRouter from './routes/UserRoutes';
import imagesRouter from './routes/ImagesRoutes';
import videosRouter from './routes/VideosRoutes';
import statsRouter from './routes/StatsRoutes';
import trashRouter from './routes/TrashRoutes';
import recentsRouter from './routes/RecentsRoutes';
import foldersRouter from './routes/FoldersRoutes';
import adminRouter from './routes/AdminRoutes';
import profileRouter from './routes/ProfileRoutes'; // ✅ NUEVA RUTA AÑADIDA

const app = express();

/******************************************************
 * 🔹 Middleware base
 ******************************************************/
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:4173',
    'http://localhost:8080',
    ...(ENV.AllowedOrigins?.split(',') || [])
  ],
  credentials: true
}));

// Compresión
app.use(compression());

// Rate limiting
app.use(
  '/api/',
  rateLimit({
    windowMs: parseInt(ENV.RateLimitWindowMs || '900000'),
    max: parseInt(ENV.RateLimitMaxRequests || '2000'),
    message: { error: 'Demasiadas peticiones desde esta IP.' },
  })
);



// Logger
if (ENV.NodeEnv === NodeEnvs.Dev) app.use(morgan('dev'));

// Helmet
if (ENV.NodeEnv === NodeEnvs.Production && !process.env.DISABLE_HELMET) {
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );
}

/******************************************************
 * 📁 Archivos estáticos (uploads)
 ******************************************************/
const uploadsPath = path.join(process.cwd(), 'uploads');

if (!fs.existsSync(uploadsPath)) {
  console.log("❌ Carpeta uploads no encontrada:", uploadsPath);
} else {
  console.log("✅ Carpeta uploads encontrada:", uploadsPath);
}

app.use('/uploads', express.static(uploadsPath, {
  cacheControl: true,
  maxAge: '0',  // evita 304
}));

/******************************************************
 * 🎬 STREAMING NORMAL DE VIDEOS
 ******************************************************/
app.get('/api/video/:userId/:filename', (req, res) => {
  const { userId, filename } = req.params;

  const filePath = path.join(uploadsPath, userId, 'videos', filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, error: 'Video not found' });
  }

  const ext = path.extname(filename).toLowerCase();
  const mime = {
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    '.mkv': 'video/x-matroska'
  }[ext] || 'video/mp4';

  res.setHeader('Content-Type', mime);
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Accept-Ranges', 'bytes');

  fs.createReadStream(filePath).pipe(res);
});

/******************************************************
 * ♻ STREAMING DE VIDEOS EN PAPELERA
 ******************************************************/
app.get('/api/trash/video/:userId/:filename', (req, res) => {
  const { userId, filename } = req.params;

  const filePath = path.join(uploadsPath, 'trash', userId, 'videos', filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ success: false, error: 'Trash video not found' });
  }

  const ext = path.extname(filename).toLowerCase();
  const mime = {
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    '.mkv': 'video/x-matroska'
  }[ext] || 'video/mp4';

  res.setHeader('Content-Type', mime);
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Accept-Ranges', 'bytes');

  fs.createReadStream(filePath).pipe(res);
});

/******************************************************
 * 🔹 Rutas principales API
 ******************************************************/
app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/images', imagesRouter);
app.use('/api/videos', videosRouter);
app.use('/api/stats', statsRouter);
app.use('/api/trash', trashRouter);
app.use('/api/recents', recentsRouter);
app.use('/api/folders', foldersRouter);
app.use('/api/admin', adminRouter);
app.use('/api/profile', profileRouter);

/******************************************************
 * 🩺 Health Check
 ******************************************************/
app.get('/health', (_: Request, res: Response) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
  });
});

/******************************************************
 * 📜 Documentación raíz (ACTUALIZADA)
 ******************************************************/
app.get('/', (_: Request, res: Response) => {
  res.json({
    message: 'API de Gestión de Imágenes - Nuvia',
    version: '1.0.0',
    documentation: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        refresh: 'POST /api/auth/refresh',
      },
      users: {
        login: 'POST /api/users/login',
        register: 'POST /api/users/register',
      },
      profile: { 
        getProfile: 'GET /api/profile',
        getStats: 'GET /api/profile/stats',
        updateProfile: 'PUT /api/profile',
        updateImage: 'POST /api/profile/image',
        updateUsername: 'PATCH /api/profile/username',
        updateEmail: 'PATCH /api/profile/email',
        updateBio: 'PATCH /api/profile/bio',
        updateLocation: 'PATCH /api/profile/location',
        updatePassword: 'PATCH /api/profile/password',
        deleteAccount: 'DELETE /api/profile',
      },
      images: {
        upload: 'POST /api/images/upload',
        uploadMultiple: 'POST /api/images/upload-multiple',
        list: 'GET /api/images',
        getById: 'GET /api/images/:id',
        delete: 'DELETE /api/images/:id',
      },
      videos: {
        upload: 'POST /api/videos/upload',
        list: 'GET /api/videos',
        getById: 'GET /api/videos/:id',
        stream: 'GET /api/video/:userId/:filename',
      },
      recents: {
        list: 'GET /api/recents',
        stats: 'GET /api/recents/stats',
        images: 'GET /api/recents/images',
        videos: 'GET /api/recents/videos',
        timeline: 'GET /api/recents/timeline',
        mostViewed: 'GET /api/recents/most-viewed',
      },
      folders: {
        list: 'GET /api/folders',
        getById: 'GET /api/folders/:id',
        content: 'GET /api/folders/:id/content',
        create: 'POST /api/folders',
        update: 'PATCH /api/folders/:id',
        delete: 'DELETE /api/folders/:id',
        addImage: 'POST /api/folders/:id/images',
        removeImage: 'DELETE /api/folders/:id/images/:imageId',
      },
      admin: {
        stats: 'GET /api/admin/stats',
        users: 'GET /api/admin/users',
        userDetails: 'GET /api/admin/users/:id',
        suspendUser: 'POST /api/admin/users/:id/suspend',
        updateStorage: 'PUT /api/admin/users/:id/storage',
        deleteUser: 'DELETE /api/admin/users/:id',
        export: 'GET /api/admin/export',
        search: 'GET /api/admin/search',
        activity: 'GET /api/admin/activity',
        verify: 'GET /api/admin/verify',
      }
    },
    status: 'online',
  });
});

/******************************************************
 * ⚠️ Middleware de errores
 ******************************************************/
app.use((err: any, req: Request, res: Response, _: NextFunction) => {
  logger.err(err);

  return res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Error interno',
  });
});

/******************************************************
 * 🚫 404
 ******************************************************/
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Ruta no encontrada',
    path: req.originalUrl
  });
});

export default app;
