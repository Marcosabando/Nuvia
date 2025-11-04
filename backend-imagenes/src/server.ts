// src/server.ts
import express, { Request, Response, NextFunction } from 'express';
import morgan from 'morgan';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';
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
import statsRouter from './routes/StatsRoutes';  // Importar rutas de estadísticas

const app = express();


/******************************************************
 * Middleware base
 ******************************************************/

// Parsing de JSON y URL-encoded
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ✅ CORS CORREGIDO - Opción más permisiva para desarrollo
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
  windowMs: parseInt(ENV.RateLimitWindowMs || '900000'), // 15 min
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

// ✅ Servir archivos estáticos (uploads) - ANTES de las rutas
const uploadsPath = path.join(__dirname, '..', 'uploads');
app.use('/uploads', express.static(uploadsPath));

/******************************************************
 * Rutas API
 ******************************************************/
import userRouter from './routes/UserRoutes';

// app.use('/api/auth', authRouter);
app.use('/api/users', userRouter);
app.use('/api/images', imagesRouter);
app.use('/api/stats', statsRouter); // 
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
        login: 'POST /api/users/login', // ✅ Ruta del login
        register: 'POST /api/users/register'
      },
      images: {
        upload: 'POST /api/images/upload',
        uploadMultiple: 'POST /api/images/upload-multiple',
        list: 'GET /api/images',
        getById: 'GET /api/images/:id',
        delete: 'DELETE /api/images/:id'
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