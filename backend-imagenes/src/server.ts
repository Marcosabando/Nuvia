// src/server.ts
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
import HttpStatusCodes from '@src/common/constants/HttpStatusCodes';
import { NodeEnvs } from '@src/common/constants';
import { RouteError } from '@src/common/util/route-errors';
import { testConnection } from '@src/config/database';

// Rutas
import authRouter from './routes/auth';
import userRouter from './routes/UserRoutes';
import imagesRouter from './routes/ImagesRoutes';
import videosRouter from './routes/VideosRoutes';
import statsRouter from './routes/StatsRoutes';
import trashRouter from './routes/TrashRoutes';

const app = express();

/******************************************************
 * 🔹 Middleware base
 ******************************************************/

// Parsing de JSON y URL-encoded
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ✅ Configuración CORS
const corsOptions = {
  origin: function (origin: string | undefined, callback: Function) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:4173',
      'http://localhost:8080',
      ...(ENV.AllowedOrigins?.split(',') || [])
    ];

    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`❌ Origen bloqueado por CORS: ${origin}`);
      callback(new Error('No permitido por CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};
app.use(cors(corsOptions));

// Compresión
app.use(compression());

// Rate limiting
app.use(
  '/api/',
  rateLimit({
    windowMs: parseInt(ENV.RateLimitWindowMs || '900000'),
    max: parseInt(ENV.RateLimitMaxRequests || '100'),
    message: { error: 'Demasiadas peticiones desde esta IP. Intenta más tarde.' },
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Logger (solo en desarrollo)
if (ENV.NodeEnv === NodeEnvs.Dev) app.use(morgan('dev'));

// Helmet (solo en producción)
if (ENV.NodeEnv === NodeEnvs.Production && !process.env.DISABLE_HELMET) {
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
        },
      },
    })
  );
}

/******************************************************
 * 📁 Archivos estáticos (uploads)
 ******************************************************/
const uploadsPath = path.join(process.cwd(), "uploads");

if (!fs.existsSync(uploadsPath)) {
  console.log("❌ Carpeta uploads no encontrada:", uploadsPath);
} else {
  console.log("✅ Carpeta uploads encontrada en:", uploadsPath);
}

// 🚀 Servir todas las rutas dentro de /uploads (subcarpetas incluidas)
app.use("/uploads", express.static(uploadsPath, {
  dotfiles: "deny",
  extensions: ["jpg", "jpeg", "png", "gif", "webp"],
  setHeaders: (res, filePath) => {
    // Establece el tipo MIME correcto
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp"
    };
    res.setHeader("Content-Type", mimeTypes[ext] || "application/octet-stream");
    res.setHeader("Cache-Control", "public, max-age=3600");
  }
}));

/******************************************************
 * 🎬 Ruta específica para streaming de videos
 ******************************************************/
app.get('/api/video/:userId/:filename', (req, res) => {
  try {
    const { userId, filename } = req.params;
    console.log('🎬 Solicitando video:', { userId, filename });

    const possiblePaths = [
      path.join(process.cwd(), 'uploads', userId, 'videos', filename),
      path.join(process.cwd(), 'uploads', 'videos', userId, filename),
      path.join(__dirname, '..', 'uploads', userId, 'videos', filename),
      path.join(__dirname, '..', 'uploads', 'videos', userId, filename),
    ];

    let videoPath = '';
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        videoPath = p;
        console.log('✅ Video encontrado en:', p);
        break;
      }
    }

    if (!videoPath) {
      console.log('❌ Video no encontrado en ninguna ruta');
      return res.status(404).json({
        success: false,
        error: 'Video not found',
        message: `El archivo ${filename} no existe en el servidor`,
      });
    }

    const ext = path.extname(filename).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo',
      '.mkv': 'video/x-matroska',
    };

    const mimeType = mimeMap[ext] || 'video/mp4';
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Accept-Ranges', 'bytes');

    const stream = fs.createReadStream(videoPath);
    stream.on('error', (err) => {
      console.error('❌ Error al enviar el video:', err);
      res.status(500).json({ success: false, error: 'Error al transmitir el video' });
    });
    stream.pipe(res);
  } catch (err) {
    console.error('❌ Error en ruta de video:', err);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
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
 * 📜 Documentación raíz
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
    },
    status: 'online',
  });
});

/******************************************************
 * 🔹 Conexión a Base de Datos
 ******************************************************/
testConnection()
  .then(() => logger.info('✅ Base de datos conectada correctamente'))
  .catch((error) => {
    logger.err('❌ Error conectando a la base de datos:', error);
    process.exit(1);
  });

/******************************************************
 * ⚠️ Middleware de errores
 ******************************************************/
app.use((err: Error, req: Request, res: Response, _: NextFunction) => {
  if (ENV.NodeEnv !== NodeEnvs.Test) logger.err(err, true);

  let status = HttpStatusCodes.INTERNAL_SERVER_ERROR;
  let message = 'Error interno del servidor';

  if (err instanceof RouteError) {
    status = err.status;
    message = err.message;
  } else if (err.name === 'ValidationError') {
    status = HttpStatusCodes.BAD_REQUEST;
    message = 'Datos inválidos';
  } else if (err.name === 'UnauthorizedError') {
    status = HttpStatusCodes.UNAUTHORIZED;
    message = 'Token inválido';
  } else if (err.message.includes('CORS')) {
    status = HttpStatusCodes.FORBIDDEN;
    message = 'Acceso no permitido por CORS';
  }

  res.status(status).json({
    success: false,
    error: message,
    ...(ENV.NodeEnv === NodeEnvs.Dev && { stack: err.stack, details: err.message }),
  });
});

/******************************************************
 * 🚫 Middleware 404
 ******************************************************/
app.use((req: Request, res: Response) => {
  res.status(HttpStatusCodes.NOT_FOUND).json({
    success: false,
    error: 'Ruta no encontrada',
    path: req.originalUrl,
  });
});

/******************************************************
 * ✅ Export
 ******************************************************/
export default app;
