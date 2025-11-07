// src/server.ts
import express, { Request, Response, NextFunction } from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs'; // ✅ AÑADIR ESTA IMPORTACIÓN
import logger from 'jet-logger';

// Importaciones propias
import ENV from '@src/common/constants/ENV';
import HttpStatusCodes from '@src/common/constants/HttpStatusCodes';
import { NodeEnvs } from '@src/common/constants';
import { RouteError } from '@src/common/util/route-errors';
import authRouter from './routes/auth';
import imagesRouter from './routes/ImagesRoutes';
import videosRouter from './routes/VideosRoutes';
import { testConnection } from '@src/config/database';
import statsRouter from './routes/StatsRoutes';

const app = express();

/******************************************************
 * Middleware base
 ******************************************************/

// Parsing de JSON y URL-encoded
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ✅ CORS CORREGIDO
const corsOptions = {
  origin: function (origin: string | undefined, callback: Function) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:5173',
      'http://localhost:5174',
      'http://localhost:4173',
      "http://localhost:3000",
      "http://localhost:8080",
      ...(ENV.AllowedOrigins?.split(',') || [])
    ];
    
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
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

// Compresión de respuestas
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(ENV.RateLimitWindowMs || '900000'),
  max: parseInt(ENV.RateLimitMaxRequests || '100'),
  message: {
    error: 'Demasiadas peticiones desde esta IP, intenta de nuevo más tarde.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Logger en desarrollo
if (ENV.NodeEnv === NodeEnvs.Dev) {
  app.use(morgan('dev'));
}

// Seguridad en producción
if (ENV.NodeEnv === NodeEnvs.Production && !process.env.DISABLE_HELMET) {
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: "cross-origin" },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "https:"],
        },
      },
    })
  );
}

// ✅ Servir archivos estáticos (uploads) - CON DEBUG
const uploadsPath = path.join(process.cwd(), 'uploads');
console.log('📁 Ruta de uploads:', uploadsPath);

// Verificar si la carpeta existe
if (!fs.existsSync(uploadsPath)) {
  console.log('❌ Carpeta uploads no encontrada en:', uploadsPath);
} else {
  console.log('✅ Carpeta uploads encontrada');
}

app.use('/uploads', express.static(uploadsPath, {
  setHeaders: (res, filePath) => {
    // Configurar MIME types específicos para videos
    if (filePath.endsWith('.mp4')) {
      res.setHeader('Content-Type', 'video/mp4');
    } else if (filePath.endsWith('.webm')) {
      res.setHeader('Content-Type', 'video/webm');
    } else if (filePath.endsWith('.mov')) {
      res.setHeader('Content-Type', 'video/quicktime');
    } else if (filePath.endsWith('.avi')) {
      res.setHeader('Content-Type', 'video/x-msvideo');
    } else if (filePath.endsWith('.mkv')) {
      res.setHeader('Content-Type', 'video/x-matroska');
    }
  }
}));

/******************************************************
 * ✅ RUTA ESPECÍFICA PARA VIDEOS - AÑADIR ESTO
 ******************************************************/
app.get('/api/video/:userId/:filename', (req, res) => {
  try {
    const { userId, filename } = req.params;
    
    console.log('🎬 Solicitando video:', { userId, filename });

    // ✅ RUTAS ACTUALIZADAS para la nueva estructura
    const possiblePaths = [
      // Nueva estructura: uploads/userId/videos/filename
      path.join(process.cwd(), 'uploads', userId, 'videos', filename),
      // Estructura anterior (para compatibilidad)
      path.join(process.cwd(), 'uploads', 'videos', userId, filename),
      path.join(__dirname, '..', 'uploads', userId, 'videos', filename),
      path.join(__dirname, '..', 'uploads', 'videos', userId, filename),
    ];

    console.log('🔍 Buscando en rutas:');
    possiblePaths.forEach((possiblePath, index) => {
      const exists = fs.existsSync(possiblePath);
      console.log(`  ${index + 1}. ${possiblePath} ${exists ? '✅' : '❌'}`);
    });

    let videoPath = '';
    for (const possiblePath of possiblePaths) {
      if (fs.existsSync(possiblePath)) {
        videoPath = possiblePath;
        console.log('✅ Video encontrado en:', videoPath);
        break;
      }
    }

    if (!videoPath) {
      console.log('❌ Video no encontrado en ninguna ruta');
      
      // Listar qué archivos SÍ existen
      const newStructureDir = path.join(process.cwd(), 'uploads', userId, 'videos');
      const oldStructureDir = path.join(process.cwd(), 'uploads', 'videos', userId);
      
      console.log('📁 Buscando en nueva estructura:', newStructureDir);
      if (fs.existsSync(newStructureDir)) {
        const files = fs.readdirSync(newStructureDir);
        console.log('📹 Archivos en nueva estructura:', files);
      }
      
      console.log('📁 Buscando en estructura vieja:', oldStructureDir);
      if (fs.existsSync(oldStructureDir)) {
        const files = fs.readdirSync(oldStructureDir);
        console.log('📹 Archivos en estructura vieja:', files);
      }
      
      return res.status(404).json({ 
        success: false,
        error: 'Video not found',
        message: `El archivo ${filename} no existe en el servidor`
      });
    }

    // Configurar MIME type
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes: { [key: string]: string } = {
      '.mp4': 'video/mp4',
      '.webm': 'video/webm',
      '.mov': 'video/quicktime',
      '.avi': 'video/x-msvideo',
      '.mkv': 'video/x-matroska'
    };

    const mimeType = mimeTypes[ext] || 'video/mp4';
    
    console.log('📦 Sirviendo video con MIME type:', mimeType);
    
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Accept-Ranges', 'bytes');

    const videoStream = fs.createReadStream(videoPath);
    
    videoStream.on('error', (error) => {
      console.error('❌ Error streaming video:', error);
      res.status(500).json({ 
        success: false,
        error: 'Error streaming video' 
      });
    });

    videoStream.pipe(res);

  } catch (error) {
    console.error('❌ Error en ruta de video:', error);
    res.status(500).json({ 
      success: false,
      error: 'Internal server error' 
    });
  }
});

/******************************************************
 * Rutas API
 ******************************************************/
import userRouter from './routes/UserRoutes';

app.use('/api/users', userRouter);
app.use('/api/images', imagesRouter);
app.use('/api/stats', statsRouter);
app.use('/api/videos', videosRouter);

// Health check
app.get('/health', (_: Request, res: Response) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage()
  });
});

// ✅ Ruta raíz con documentación de API
app.get('/', (_: Request, res: Response) => {
  res.json({ 
    message: 'API de Gestión de Imágenes - Nuvia',
    version: '1.0.0',
    documentation: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        refresh: 'POST /api/auth/refresh'
      },
      users: {
        login: 'POST /api/users/login',
        register: 'POST /api/users/register'
      },
      images: {
        upload: 'POST /api/images/upload',
        uploadMultiple: 'POST /api/images/upload-multiple',
        list: 'GET /api/images',
        getById: 'GET /api/images/:id',
        delete: 'DELETE /api/images/:id'
      },
      videos: {
        upload: 'POST /api/videos/upload',
        list: 'GET /api/videos',
        getById: 'GET /api/videos/:id',
        stream: 'GET /api/video/:userId/:filename' // ✅ AÑADIR ESTA RUTA
      }
    },
    status: 'online'
  });
});

/******************************************************
 * Conexión a DB
 ******************************************************/
testConnection()
  .then(() => logger.info('✅ Base de datos conectada correctamente'))
  .catch((error) => {
    logger.err('❌ Error conectando a la base de datos:', error);
    process.exit(1);
  });

/******************************************************
 * Middleware de errores
 ******************************************************/
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  if (ENV.NodeEnv !== NodeEnvs.Test.valueOf()) {
    logger.err(err, true);
  }

  let status = HttpStatusCodes.INTERNAL_SERVER_ERROR;
  let message = 'Error interno del servidor';

  if (err instanceof RouteError) {
    status = err.status;
    message = err.message;
  } else if (err.name === 'ValidationError') {
    status = HttpStatusCodes.BAD_REQUEST;
    message = 'Datos de entrada inválidos';
  } else if (err.name === 'UnauthorizedError') {
    status = HttpStatusCodes.UNAUTHORIZED;
    message = 'Token de acceso inválido';
  } else if (err.message.includes('CORS')) {
    status = HttpStatusCodes.FORBIDDEN;
    message = 'Acceso no permitido por CORS';
  } else if (err.message.includes('Multer') || err.message.includes('archivo')) {
    status = HttpStatusCodes.BAD_REQUEST;
    message = err.message;
  } else if (err.message.includes('Usuario no autenticado')) {
    status = HttpStatusCodes.UNAUTHORIZED;
    message = 'Debe autenticarse para realizar esta acción';
  }

  res.status(status).json({ 
    success: false,
    error: message,
    ...(ENV.NodeEnv === NodeEnvs.Dev && { 
      stack: err.stack,
      details: err.message 
    })
  });
});

// Middleware 404
app.use((_: Request, res: Response) => {
  res.status(HttpStatusCodes.NOT_FOUND).json({
    success: false,
    error: 'Ruta no encontrada',
    path: _.originalUrl
  });
});

/******************************************************
 * Export
 ******************************************************/
export default app;