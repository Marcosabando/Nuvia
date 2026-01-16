// server.ts - VERSIÓN FINAL CORREGIDA
import express, { Request, Response, NextFunction } from "express";
import morgan from "morgan";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import rateLimit from "express-rate-limit";
import path from "path";
import fs from "fs";
import logger from "jet-logger";
import bodyParser from "body-parser";

// Importaciones propias
import ENV from "@src/common/constants/ENV";
import { NodeEnvs } from "@src/common/constants";

// Rutas
import authRouter from "./routes/auth";
import userRouter from "./routes/UserRoutes";
import imagesRouter from "./routes/ImagesRoutes";
import videosRouter from "./routes/VideosRoutes";
import statsRouter from "./routes/StatsRoutes";
import trashRouter from "./routes/TrashRoutes";
import recentsRouter from "./routes/RecentsRoutes";
import foldersRouter from "./routes/FoldersRoutes";
import adminRouter from "./routes/AdminRoutes";
import profileRouter from "./routes/ProfileRoutes";
import documentsRouter from "./routes/DocumentsRoutes";
import LocalStorageService from "./services/LocalStorageService";

const app = express();

/******************************************************
 * 🔹 Middleware base - ACTUALIZADO PARA 3GB
 ******************************************************/

// Configurar timeouts para archivos grandes (30 minutos)
app.use((req, res, next) => {
  req.setTimeout(30 * 60 * 1000);
  res.setTimeout(30 * 60 * 1000);
  next();
});

// Límites de cuerpo aumentados para 3GB
app.use(express.json({ limit: "10mb" })); // 10MB máximo
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Body parser con límites mayores
app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ limit: "10mb", extended: true }));

/******************************************************
 * 🔹 CORS - CONFIGURACIÓN CORREGIDA SIN 'app.options('*', ...)'
 ******************************************************/
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Lista de orígenes permitidos
    const allowedOrigins = [
      "http://localhost:3000",
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:4173",
      "http://localhost:8080",
      ...(ENV.AllowedOrigins?.split(",").filter(Boolean) || []),
    ];

    // Permitir requests sin origin (Postman, curl, herramientas CLI)
    if (!origin) {
      return callback(null, true);
    }

    // Verificar si el origin está en la lista permitida
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`⚠️ CORS blocked origin: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "X-File-Size",
    "X-File-Name",
    "Accept",
    "Origin",
    "Cache-Control",
  ],
  exposedHeaders: ["Content-Length", "Content-Type", "Content-Disposition", "Authorization"],
  maxAge: 86400,
};

// ✅ SOLUCIÓN 1: Solo usar cors() sin app.options() adicional
app.use(cors(corsOptions));

// ✅ SOLUCIÓN 2: Middleware manual para OPTIONS requests
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.method === "OPTIONS") {
    const origin = req.headers.origin as string | undefined;
    if (origin) {
      const allowedOrigins = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:4173",
        "http://localhost:8080",
        ...(ENV.AllowedOrigins?.split(",").filter(Boolean) || []),
      ];
      if (allowedOrigins.includes(origin)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
      }
    }
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With, X-File-Size, X-File-Name, Accept, Origin, Cache-Control"
    );
    res.setHeader("Access-Control-Expose-Headers", "Content-Length, Content-Type, Content-Disposition, Authorization");
    res.setHeader("Access-Control-Max-Age", "86400");
    res.sendStatus(200);
    return;
  }

  // Para métodos no OPTIONS, agregar headers CORS
  const origin = req.headers.origin as string | undefined;
  if (origin) {
    const allowedOrigins = [
      "http://localhost:3000",
      "http://localhost:5173",
      "http://localhost:5174",
      "http://localhost:4173",
      "http://localhost:8080",
      ...(ENV.AllowedOrigins?.split(",").filter(Boolean) || []),
    ];
    if (allowedOrigins.includes(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    }
  }
  res.setHeader("Access-Control-Allow-Credentials", "true");
  next();
});

/******************************************************
 * 🔹 MIDDLEWARE PARA SERIALIZAR BIGINT
 ******************************************************/
app.use((req: Request, res: Response, next: NextFunction) => {
  const originalJson = res.json;

  res.json = function (data: any) {
    const convertBigIntToString = (obj: any): any => {
      if (obj === null || obj === undefined) {
        return obj;
      }

      if (typeof obj === "bigint") {
        return obj.toString();
      }

      if (Array.isArray(obj)) {
        return obj.map(convertBigIntToString);
      }

      if (typeof obj === "object" && !(obj instanceof Date)) {
        const newObj: any = {};
        for (const key in obj) {
          if (obj.hasOwnProperty(key)) {
            newObj[key] = convertBigIntToString(obj[key]);
          }
        }
        return newObj;
      }

      return obj;
    };

    const processedData = convertBigIntToString(data);
    return originalJson.call(this, processedData);
  };

  next();
});

/******************************************************
 * 📄 Headers especiales para PDFs y documentos
 ******************************************************/
app.use((req, res, next) => {
  const origin = req.headers.origin as string | undefined;

  if (req.path.includes("/documents") || req.path.includes(".pdf")) {
    if (origin) {
      const allowedOrigins = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:4173",
        "http://localhost:8080",
        ...(ENV.AllowedOrigins?.split(",").filter(Boolean) || []),
      ];
      if (allowedOrigins.includes(origin)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Access-Control-Allow-Credentials", "true");
      }
    }
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("X-Frame-Options", "ALLOWALL");

    console.log(`[PDF_HEADERS] Origin: ${origin || "none"}, Path: ${req.path}`);
  }

  next();
});

// Compresión
app.use(
  compression({
    filter: (req: Request, res: Response) => {
      if (
        req.headers["content-type"]?.includes("multipart/form-data") ||
        req.path.includes("/uploads/") ||
        req.path.includes("/api/video/") ||
        req.path.includes("/api/documents/")
      ) {
        return false;
      }
      return compression.filter(req, res);
    },
  })
);

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: parseInt(ENV.RateLimitWindowMs || "900000"),
  max: parseInt(ENV.RateLimitMaxRequests || "2000"),
  message: { error: "Demasiadas peticiones desde esta IP." },
  skip: (req: Request) => {
    return req.path.includes("/upload") || req.path.includes("/api/video/") || req.path.includes("/api/documents/");
  },
});

app.use("/api/", apiLimiter);

// Logger
if (ENV.NodeEnv === NodeEnvs.Dev) {
  app.use(morgan("dev"));
} else {
  app.use(
    morgan("combined", {
      skip: (req: Request, res: Response) => {
        return (
          req.path.includes("/uploads/") || req.path.includes("/api/video/") || req.path.includes("/api/documents/")
        );
      },
    })
  );
}

// Helmet
if (ENV.NodeEnv === NodeEnvs.Production && !process.env.DISABLE_HELMET) {
  app.use(
    helmet({
      frameguard: false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          frameAncestors: [
            "'self'",
            "http://localhost:3000",
            "http://localhost:5173",
            "http://localhost:5174",
            "http://localhost:8080",
          ],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'"],
          imgSrc: ["'self'", "data:", "blob:", "*"],
          mediaSrc: ["'self'", "blob:", "*"],
          connectSrc: ["'self'", "*"],
        },
      },
      crossOriginEmbedderPolicy: false,
    })
  );
}

/******************************************************
 * 📁 Archivos estáticos (uploads)
 ******************************************************/
const uploadsPath = path.join(process.cwd(), "uploads");

if (!fs.existsSync(uploadsPath)) {
  try {
    fs.mkdirSync(uploadsPath, { recursive: true });
    console.log("✅ Carpeta uploads creada:", uploadsPath);
  } catch (error) {
    console.error("❌ Error creando carpeta uploads:", error);
  }
} else {
  console.log("✅ Carpeta uploads encontrada:", uploadsPath);
}

app.use(
  "/uploads",
  express.static(uploadsPath, {
    cacheControl: true,
    maxAge: "1d",
    setHeaders: (res: Response, filePath: string) => {
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");

      const ext = path.extname(filePath).toLowerCase();

      if ([".mp4", ".webm", ".avi", ".mov", ".mkv"].includes(ext)) {
        res.setHeader("Cache-Control", "public, max-age=86400");
        res.setHeader("Accept-Ranges", "bytes");
      } else if ([".jpg", ".jpeg", ".png", ".gif", ".webp"].includes(ext)) {
        res.setHeader("Cache-Control", "public, max-age=604800");
      } else if ([".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx"].includes(ext)) {
        res.setHeader("Cache-Control", "public, max-age=3600");
        res.setHeader("Content-Disposition", "inline");
      } else {
        res.setHeader("Cache-Control", "public, max-age=3600");
      }
    },
  })
);

/******************************************************
 * 🎬 STREAMING DE VIDEOS
 ******************************************************/
app.get("/api/video/:userId/:filename", (req: Request, res: Response) => {
  const { userId, filename } = req.params;
  const filePath = path.join(uploadsPath, userId, "videos", filename);

  console.log(`🎬 Solicitando video: ${filePath}`);

  if (!fs.existsSync(filePath)) {
    console.log(`❌ Video no encontrado: ${filePath}`);
    return res.status(404).json({
      success: false,
      error: "Video no encontrado",
    });
  }

  try {
    const stats = fs.statSync(filePath);
    const ext = path.extname(filename).toLowerCase();

    const mimeTypes: Record<string, string> = {
      ".mp4": "video/mp4",
      ".webm": "video/webm",
      ".mov": "video/quicktime",
      ".avi": "video/x-msvideo",
      ".mkv": "video/x-matroska",
      ".flv": "video/x-flv",
      ".wmv": "video/x-ms-wmv",
      ".3gp": "video/3gpp",
    };

    const mime = mimeTypes[ext] || "video/mp4";
    const fileSize = stats.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;

      console.log(`📊 Streaming parcial: ${start}-${end}/${fileSize}`);

      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunksize,
        "Content-Type": mime,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      });

      const stream = fs.createReadStream(filePath, { start, end });
      stream.pipe(res);
    } else {
      console.log(`📊 Streaming completo: ${fileSize} bytes`);

      res.writeHead(200, {
        "Content-Length": fileSize,
        "Content-Type": mime,
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      });

      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
    }
  } catch (error: any) {
    console.error("❌ Error streaming video:", error);
    res.status(500).json({
      success: false,
      error: "Error interno del servidor",
    });
  }
});

/******************************************************
 * ♻ STREAMING DE VIDEOS EN PAPELERA
 ******************************************************/
app.get("/api/trash/video/:userId/:filename", (req: Request, res: Response) => {
  const { userId, filename } = req.params;
  const filePath = path.join(uploadsPath, "trash", userId, "videos", filename);

  console.log(`🗑️ Solicitando video de papelera: ${filePath}`);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({
      success: false,
      error: "Video en papelera no encontrado",
    });
  }

  try {
    const stats = fs.statSync(filePath);
    const ext = path.extname(filename).toLowerCase();

    const mimeTypes: Record<string, string> = {
      ".mp4": "video/mp4",
      ".webm": "video/webm",
      ".mov": "video/quicktime",
      ".avi": "video/x-msvideo",
      ".mkv": "video/x-matroska",
    };

    const mime = mimeTypes[ext] || "video/mp4";
    const fileSize = stats.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;

      res.writeHead(206, {
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunksize,
        "Content-Type": mime,
        "Cache-Control": "no-cache, no-store, must-revalidate",
      });

      const stream = fs.createReadStream(filePath, { start, end });
      stream.pipe(res);
    } else {
      res.writeHead(200, {
        "Content-Length": fileSize,
        "Content-Type": mime,
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      });

      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
    }
  } catch (error: any) {
    console.error("❌ Error streaming video de papelera:", error);
    res.status(500).json({
      success: false,
      error: "Error interno del servidor",
    });
  }
});

/******************************************************
 * 🔹 Rutas principales API
 ******************************************************/
app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/images", imagesRouter);
app.use("/api/videos", videosRouter);
app.use("/api/stats", statsRouter);
app.use("/api/trash", trashRouter);
app.use("/api/recents", recentsRouter);
app.use("/api/folders", foldersRouter);
app.use("/api/admin", adminRouter);
app.use("/api/profile", profileRouter);
app.use("/api/documents", documentsRouter);

/******************************************************
 * 🩺 Health Check
 ******************************************************/
app.get("/health", (_: Request, res: Response) => {
  const memoryUsage = process.memoryUsage();

  res.json({
    status: "OK",
    service: "Nuvia API",
    version: "2.1.0",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: {
      rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
      external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`,
    },
    node: {
      version: process.version,
      platform: process.platform,
      pid: process.pid,
    },
    uploads: {
      path: uploadsPath,
      exists: fs.existsSync(uploadsPath),
    },
  });
});

/******************************************************
 * 📜 Documentación raíz
 ******************************************************/
app.get("/", (_: Request, res: Response) => {
  res.json({
    message: "API de Gestión de Archivos - Nuvia",
    version: "2.1.0",
    maxFileSize: "3GB por archivo",
    documentation: {
      auth: {
        register: "POST /api/auth/register",
        login: "POST /api/auth/login",
        refresh: "POST /api/auth/refresh",
      },
      documents: {
        upload: "POST /api/documents/upload",
        list: "GET /api/documents",
        search: "GET /api/documents/search",
        stats: "GET /api/documents/stats",
        getById: "GET /api/documents/:id",
        file: "GET /api/documents/:id/file",
        download: "GET /api/documents/:id/download",
        preview: "GET /api/documents/:id/preview",
        update: "PUT /api/documents/:id",
        favorite: "PATCH /api/documents/:id/favorite",
        delete: "DELETE /api/documents/:id",
        byCategory: "GET /api/documents/category/:category",
      },
      images: {
        upload: "POST /api/images/upload",
        list: "GET /api/images",
        maxSize: "3GB",
      },
      videos: {
        upload: "POST /api/videos/upload",
        list: "GET /api/videos",
        stream: "GET /api/video/:userId/:filename",
        maxSize: "3GB",
      },
    },
    status: "online",
    timestamp: new Date().toISOString(),
    features: {
      images: true,
      videos: true,
      documents: true,
      maxFileSize: "3GB",
      cors: {
        credentials: true,
        allowedOrigins: [
          "http://localhost:3000",
          "http://localhost:5173",
          "http://localhost:5174",
          "http://localhost:4173",
          "http://localhost:8080",
          ...(ENV.AllowedOrigins?.split(",").filter(Boolean) || []),
        ],
      },
    },
  });
});

/******************************************************
 * ⚠️ Middleware de errores
 ******************************************************/
app.use((err: any, req: Request, res: Response, _: NextFunction) => {
  logger.err(err);

  console.error("💥 Error en la aplicación:", {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
  });

  if (err.message && err.message.includes("request entity too large")) {
    return res.status(413).json({
      success: false,
      error: "El archivo es demasiado grande. Tamaño máximo: 3GB",
      code: "FILE_TOO_LARGE",
      maxSize: "3GB",
    });
  }

  if (err.message && err.message.includes("timeout")) {
    return res.status(408).json({
      success: false,
      error: "La solicitud tardó demasiado tiempo",
      code: "REQUEST_TIMEOUT",
    });
  }

  return res.status(err.status || 500).json({
    success: false,
    error: err.message || "Error interno del servidor",
    ...(ENV.NodeEnv === NodeEnvs.Dev && {
      stack: err.stack,
    }),
  });
});

app.get("/api/system/disks", async (req: Request, res: Response) => {
  try {
    const disks = await LocalStorageService.getDiskInfo();

    // Alertar si algún disco tiene menos del 10% libre
    const warnings = disks.filter((disk) => disk.percentUsed > 90);

    res.json({
      success: true,
      data: disks,
      warnings:
        warnings.length > 0
          ? {
              message: `${warnings.length} disco(s) con poco espacio`,
              disks: warnings.map((d) => ({
                path: d.path,
                freePercent: (100 - d.percentUsed).toFixed(1),
                freeGB: (d.free / 1024 / 1024 / 1024).toFixed(2),
              })),
            }
          : null,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: "Error obteniendo información de discos",
    });
  }
});
/******************************************************
 * 🚫 404
 ******************************************************/
app.use((req: Request, res: Response) => {
  console.log(`❌ Ruta no encontrada: ${req.method} ${req.originalUrl}`);

  res.status(404).json({
    success: false,
    error: "Ruta no encontrada",
    path: req.originalUrl,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
});

export default app;
