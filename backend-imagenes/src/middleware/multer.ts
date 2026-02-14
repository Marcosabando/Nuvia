// src/middleware/multer.ts - VERSIÓN CORREGIDA CON 3GB
import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import sharp from "sharp";
import { Request, Response, NextFunction } from "express";

// Tipos MIME permitidos - ACTUALIZADO CON DOCUMENTOS
export const ALLOWED_MIME_TYPES = [
  // Imágenes
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/svg+xml",
  "image/tiff",
  "image/bmp",

  // Videos
  "video/quicktime",
  "video/mp4",
  "video/avi",
  "video/mkv",
  "video/webm",
  "video/x-msvideo",
  "video/x-matroska",

  // Documentos - NUEVOS TIPOS
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.oasis.opendocument.text",
  "application/vnd.oasis.opendocument.spreadsheet",
  "application/vnd.oasis.opendocument.presentation",
  "text/plain",
  "text/csv",
  "application/rtf",
  "application/zip",
  "application/x-rar-compressed",
  "application/x-7z-compressed",
  "application/x-tar",
  "application/gzip",
  "application/json",
  "application/xml",
  "text/html",
  "text/css",
  "application/javascript",
  "text/markdown",
  "application/epub+zip",
  "application/x-mobipocket-ebook",
  "font/ttf",
  "font/otf",
  "font/woff",
  "font/woff2",
];

// ✅ TAMAÑOS MÁXIMOS ACTUALIZADOS A 3GB
export const MAX_IMAGE_SIZE = 3 * 1024 * 1024 * 1024; // 3GB para imágenes
export const MAX_VIDEO_SIZE = 3 * 1024 * 1024 * 1024; // 3GB para videos
export const MAX_DOCUMENT_SIZE = 3 * 1024 * 1024 * 1024; // 3GB para documentos

// Interface extendida para Request con user
interface AuthRequest extends Request {
  user?: {
    userId: number;
    email: string;
    username: string;
  };
}

// ✅ CONFIGURACIÓN CORREGIDA: Estructura por usuario con subcarpetas
const getStorage = (fileType: "image" | "video" | "profile" | "document") => {
  return multer.diskStorage({
    destination: (req: Request, file, cb) => {
      const authReq = req as AuthRequest;
      const userId = authReq.user?.userId;

      if (!userId) {
        return cb(new Error("Usuario no autenticado"), "");
      }

      // Crear directorio base de uploads si no existe
      const uploadsDir = path.join(process.cwd(), "uploads");
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      // ✅ ESTRUCTURA CORREGIDA:
      const userDir = path.join(uploadsDir, userId.toString());

      let typeDir: string;
      switch (fileType) {
        case "profile":
          typeDir = path.join(userDir, "profile");
          break;
        case "document":
          typeDir = path.join(userDir, "documents");
          break;
        default:
          typeDir = path.join(userDir, fileType === "image" ? "images" : "videos");
      }

      // Crear directorios recursivamente
      if (!fs.existsSync(userDir)) {
        fs.mkdirSync(userDir, { recursive: true });
        console.log("📁 Directorio de usuario creado:", userDir);
      }

      if (!fs.existsSync(typeDir)) {
        fs.mkdirSync(typeDir, { recursive: true });
        console.log("📁 Subdirectorio creado:", typeDir);
      }

      console.log(`💾 Guardando ${fileType} en:`, typeDir);
      cb(null, typeDir);
    },
    filename: (req, file, cb) => {
      // Sanitizar el nombre del archivo original
      const originalName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
      const uniqueId = uuidv4();
      const extension = path.extname(originalName).toLowerCase();
      const filename = `${Date.now()}-${uniqueId}${extension}`;
      cb(null, filename);
    },
  });
};

// ✅ CONFIGURACIÓN PARA DOCUMENTOS (3GB)
export const uploadDocument = multer({
  storage: getStorage("document"),
  fileFilter: (req, file, cb) => {
    const documentMimeTypes = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-powerpoint",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      "application/vnd.oasis.opendocument.text",
      "application/vnd.oasis.opendocument.spreadsheet",
      "application/vnd.oasis.opendocument.presentation",
      "text/plain",
      "text/csv",
      "text/markdown",
      "application/rtf",
      "application/json",
      "application/xml",
      "text/html",
      "text/css",
      "application/javascript",
      "application/zip",
      "application/x-rar-compressed",
      "application/x-7z-compressed",
      "application/x-tar",
      "application/gzip",
      "application/epub+zip",
      "application/x-mobipocket-ebook",
      "font/ttf",
      "font/otf",
      "font/woff",
      "font/woff2",
    ];

    if (documentMimeTypes.includes(file.mimetype)) {
      console.log("✅ Documento aceptado:", file.mimetype);
      cb(null, true);
    } else {
      console.log("❌ Tipo de documento no permitido:", file.mimetype);
      cb(new Error(`Tipo de documento no permitido: ${file.mimetype}`));
    }
  },
  limits: {
    fileSize: MAX_DOCUMENT_SIZE, // 3GB
    files: 10,
  },
});

// ✅ CONFIGURACIÓN PARA IMÁGENES DE PERFIL (mantener más pequeño)
export const uploadProfileImage = multer({
  storage: getStorage("profile"),
  fileFilter: (req, file, cb) => {
    const imageMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic"];

    if (imageMimeTypes.includes(file.mimetype)) {
      console.log("✅ Imagen de perfil aceptada:", file.mimetype);
      cb(null, true);
    } else {
      console.log("❌ Tipo de imagen de perfil no permitido:", file.mimetype);
      cb(new Error(`Tipo de imagen de perfil no permitido: ${file.mimetype}`));
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB máximo para imágenes de perfil
    files: 1,
  },
});

// ✅ CONFIGURACIÓN PARA IMÁGENES NORMALES (3GB)
export const uploadImage = multer({
  storage: getStorage("image"),
  fileFilter: (req, file, cb) => {
    const imageMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/heic", "image/svg+xml"];

    if (imageMimeTypes.includes(file.mimetype)) {
      console.log("✅ Imagen aceptada:", file.mimetype);
      cb(null, true);
    } else {
      console.log("❌ Tipo de imagen no permitido:", file.mimetype);
      cb(new Error(`Tipo de imagen no permitido: ${file.mimetype}`));
    }
  },
  limits: {
    fileSize: MAX_IMAGE_SIZE, // 3GB
    files: 10,
  },
});

// ✅ CONFIGURACIÓN PARA VIDEOS (3GB)
export const uploadVideo = multer({
  storage: getStorage("video"),
  fileFilter: (req, file, cb) => {
    const videoMimeTypes = [
      "video/mp4",
      "video/webm",
      "video/quicktime",
      "video/x-msvideo",
      "video/x-matroska",
      "video/avi",
      "video/mkv",
    ];

    if (videoMimeTypes.includes(file.mimetype)) {
      console.log("✅ Video aceptado:", file.mimetype);
      cb(null, true);
    } else {
      console.log("❌ Tipo de video no permitido:", file.mimetype);
      cb(new Error(`Tipo de video no permitido: ${file.mimetype}`));
    }
  },
  limits: {
    fileSize: MAX_VIDEO_SIZE, // 3GB
    files: 5,
  },
});

// ✅ MIDDLEWARE CORREGIDO PARA SUBIDA ÚNICA DE DOCUMENTOS
export const uploadSingleDocument = (req: Request, res: Response, next: NextFunction) => {
  console.log("📄 Iniciando upload de documento...");

  // ✅ ACEPTA 'document' O 'file' como campos válidos
  const uploadMiddleware = uploadDocument.fields([
    { name: "document", maxCount: 1 },
    { name: "file", maxCount: 1 },
  ]);

  uploadMiddleware(req, res, async (err: any) => {
    if (err) {
      console.error("❌ Error en upload de documento:", err.message);
      return next(err);
    }

    // Normalizar el archivo a req.file
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    if (files.document?.[0]) {
      req.file = files.document[0];
    } else if (files.file?.[0]) {
      req.file = files.file[0];
    }

    if (req.file) {
      console.log("📁 Documento procesado:", {
        filename: req.file.filename,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path,
        destination: req.file.destination,
      });

      // Extraer información adicional del documento si es posible
      try {
        await extractDocumentInfo(req.file);
      } catch (error) {
        console.error("❌ Error extrayendo información del documento:", error);
      }
    } else {
      console.log("📁 No se recibió documento");
    }

    next();
  });
};

// ✅ MIDDLEWARE CORREGIDO PARA SUBIDA MÚLTIPLE DE DOCUMENTOS
export const uploadMultipleDocuments = (req: Request, res: Response, next: NextFunction) => {
  console.log("📄 Iniciando upload múltiple de documentos...");

  // ✅ ACEPTA 'documents' O 'files' como campos válidos
  const uploadMiddleware = uploadDocument.fields([
    { name: "documents", maxCount: 10 },
    { name: "files", maxCount: 10 },
  ]);

  uploadMiddleware(req, res, async (err: any) => {
    if (err) {
      console.error("❌ Error en upload múltiple de documentos:", err.message);
      return next(err);
    }

    // Normalizar los archivos a req.files
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    if (files.documents) {
      req.files = files.documents;
    } else if (files.files) {
      req.files = files.files;
    }

    console.log(
      "📁 Documentos procesados:",
      req.files
        ? (req.files as Express.Multer.File[]).map((f) => ({
            filename: f.filename,
            originalname: f.originalname,
            mimetype: f.mimetype,
            size: f.size,
          }))
        : "No files",
    );

    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files as Express.Multer.File[]) {
        try {
          await extractDocumentInfo(file);
        } catch (error) {
          console.error("❌ Error extrayendo información del documento:", file.filename, error);
        }
      }
    }

    next();
  });
};

// ✅ MIDDLEWARE CORREGIDO PARA IMÁGENES DE PERFIL
export const uploadSingleProfileImage = (req: Request, res: Response, next: NextFunction) => {
  console.log("🖼️ Iniciando upload de imagen de perfil...");

  // ✅ Usar .single() para un solo archivo
  const uploadMiddleware = uploadProfileImage.single("profileImage");

  uploadMiddleware(req, res, async (err: any) => {
    if (err) {
      console.error("❌ Error en upload:", err.message);
      return next(err);
    }

    if (req.file) {
      console.log("📁 Imagen recibida:", req.file.filename);

      // HEIC conversion
      if (req.file.mimetype === "image/heic") {
        const oldPath = req.file.path;
        const newPath = oldPath.replace(/\.heic$/i, ".jpg");
        try {
          await sharp(oldPath).jpeg({ quality: 90 }).toFile(newPath);
          fs.unlinkSync(oldPath);
          req.file.path = newPath;
          req.file.filename = path.basename(newPath);
          req.file.mimetype = "image/jpeg";
        } catch (error) {
          return next(new Error("Error convirtiendo HEIC"));
        }
      }

      // Create versions
      try {
        await createProfileImageVersions(req.file);
      } catch (error) {
        console.error("❌ Error creando versiones:", error);
      }
    }

    next();
  });
};

// ✅ MIDDLEWARE CORREGIDO PARA SUBIDA ÚNICA DE IMÁGENES - ESTE ERA EL PROBLEMA
export const uploadSingleImage = (req: Request, res: Response, next: NextFunction) => {
  console.log("🖼️ Iniciando upload de imagen...");

  // ✅ USAR uploadImage.single() en lugar de uploadProfileImage
  const uploadMiddleware = uploadImage.single("image");

  uploadMiddleware(req, res, async (err: any) => {
    if (err) {
      console.error("❌ Error en upload de imagen:", err.message);
      return next(err);
    }

    if (req.file) {
      console.log("📁 Imagen procesada:", {
        filename: req.file.filename,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path,
        destination: req.file.destination,
      });

      // Convertir HEIC a JPEG si es necesario
      if (req.file.mimetype === "image/heic") {
        console.log("🔄 Convirtiendo HEIC a JPEG...");
        const oldPath = req.file.path;
        const newPath = oldPath.replace(/\.heic$/i, ".jpg");

        try {
          await sharp(oldPath).jpeg({ quality: 90 }).toFile(newPath);
          fs.unlinkSync(oldPath);

          req.file.path = newPath;
          req.file.filename = path.basename(newPath);
          req.file.mimetype = "image/jpeg";

          console.log("✅ HEIC convertido a JPEG:", newPath);
        } catch (error) {
          console.error("❌ Error convirtiendo HEIC a JPEG:", error);
          return next(new Error("Error convirtiendo HEIC a JPEG"));
        }
      }

      // Crear thumbnails para imágenes
      try {
        await createImageThumbnails(req.file);
      } catch (error) {
        console.error("❌ Error creando thumbnails:", error);
      }
    } else {
      console.log("📁 No se recibió imagen");
    }

    next();
  });
};

// ✅ MIDDLEWARE CORREGIDO PARA SUBIDA MÚLTIPLE DE IMÁGENES
export const uploadMultipleImages = (req: Request, res: Response, next: NextFunction) => {
  console.log("🖼️ Iniciando upload múltiple de imágenes...");

  // ✅ ACEPTA 'images' O 'files' como campos válidos
  const uploadMiddleware = uploadImage.fields([
    { name: "images", maxCount: 10 },
    { name: "files", maxCount: 10 },
  ]);

  uploadMiddleware(req, res, async (err: any) => {
    if (err) {
      console.error("❌ Error en upload múltiple de imágenes:", err.message);
      return next(err);
    }

    // Normalizar los archivos a req.files
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    if (files.images) {
      req.files = files.images;
    } else if (files.files) {
      req.files = files.files;
    }

    console.log(
      "📁 Imágenes procesadas:",
      req.files
        ? (req.files as Express.Multer.File[]).map((f) => ({
            filename: f.filename,
            originalname: f.originalname,
            mimetype: f.mimetype,
            size: f.size,
          }))
        : "No files",
    );

    if (req.files && Array.isArray(req.files)) {
      for (const file of req.files as Express.Multer.File[]) {
        // Convertir HEIC a JPEG si es necesario
        if (file.mimetype === "image/heic") {
          console.log("🔄 Convirtiendo HEIC a JPEG:", file.filename);
          const oldPath = file.path;
          const newPath = oldPath.replace(/\.heic$/i, ".jpg");
          try {
            await sharp(oldPath).jpeg({ quality: 90 }).toFile(newPath);
            fs.unlinkSync(oldPath);

            file.path = newPath;
            file.filename = path.basename(newPath);
            file.mimetype = "image/jpeg";

            console.log("✅ HEIC convertido a JPEG:", newPath);
          } catch (error) {
            console.error("❌ Error convirtiendo HEIC a JPEG:", error);
          }
        }

        // Crear thumbnails
        try {
          await createImageThumbnails(file);
        } catch (error) {
          console.error("❌ Error creando thumbnails para:", file.filename, error);
        }
      }
    }

    next();
  });
};

// ✅ MIDDLEWARE CORREGIDO PARA SUBIDA ÚNICA DE VIDEOS
export const uploadSingleVideo = (req: Request, res: Response, next: NextFunction) => {
  console.log("🎬 Iniciando upload de video...");
  console.log("🔍 DEBUG: Content-Type:", req.headers["content-type"]);

  // ✅ CONFIGURACIÓN SIMPLIFICADA - Solo acepta 'video'
  const uploadMiddleware = uploadVideo.single("video");

  uploadMiddleware(req, res, (err: any) => {
    if (err) {
      console.error("❌ Error en upload de video:", err.message);
      console.error("❌ Error code:", err.code);
      console.error("❌ Error field:", err.field);
      return next(err);
    }

    console.log(
      "✅ Video procesado exitosamente:",
      req.file
        ? {
            filename: req.file.filename,
            originalname: req.file.originalname,
            mimetype: req.file.mimetype,
            size: req.file.size,
            fieldname: req.file.fieldname,
          }
        : "No file",
    );

    next();
  });
};

// ✅ MIDDLEWARE CORREGIDO PARA SUBIDA MÚLTIPLE DE VIDEOS
export const uploadMultipleVideos = (req: Request, res: Response, next: NextFunction) => {
  console.log("🎬 Iniciando upload múltiple de videos...");

  // ✅ ACEPTA 'videos' O 'files' como campos válidos
  const uploadMiddleware = uploadVideo.fields([
    { name: "videos", maxCount: 5 },
    { name: "files", maxCount: 5 },
  ]);

  uploadMiddleware(req, res, (err: any) => {
    if (err) {
      console.error("❌ Error en upload múltiple de videos:", err.message);
      return next(err);
    }

    // Normalizar los archivos a req.files
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    if (files.videos) {
      req.files = files.videos;
    } else if (files.files) {
      req.files = files.files;
    }

    console.log(
      "📹 Videos procesados:",
      req.files
        ? (req.files as Express.Multer.File[]).map((f) => ({
            filename: f.filename,
            originalname: f.originalname,
            mimetype: f.mimetype,
            size: f.size,
            path: f.path,
          }))
        : "No files",
    );

    next();
  });
};

// ✅ FUNCIÓN MEJORADA PARA EXTRAER INFORMACIÓN DE DOCUMENTOS
const extractDocumentInfo = async (file: Express.Multer.File): Promise<void> => {
  const documentInfo: any = {
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
    extension: path.extname(file.originalname).toLowerCase(),
    uploadedAt: new Date(),
  };

  // Determinar categoría basada en MIME type y extensión
  const mime = file.mimetype.toLowerCase();
  const ext = documentInfo.extension;

  let category = "other";

  // Office (Word, Excel, PowerPoint, PDF, OpenDocument, RTF)
  if (
    mime.includes("word") ||
    mime.includes("excel") ||
    mime.includes("powerpoint") ||
    mime.includes("officedocument") ||
    mime.includes("opendocument") ||
    mime.includes("pdf") ||
    mime === "application/rtf"
  ) {
    category = "office";
  }
  // Texto y código
  else if (
    mime.startsWith("text/") ||
    mime.includes("json") ||
    mime.includes("xml") ||
    mime.includes("javascript") ||
    mime.includes("html") ||
    mime.includes("css") ||
    mime.includes("markdown") ||
    [".txt", ".md", ".log", ".ini", ".conf", ".cfg"].includes(ext)
  ) {
    category = "text";
  }
  // Imágenes (incluyendo SVG)
  else if (mime.startsWith("image/")) {
    category = "design";
  }
  // Archivos comprimidos
  else if (
    mime.includes("zip") ||
    mime.includes("rar") ||
    mime.includes("7z") ||
    mime.includes("tar") ||
    mime.includes("gzip") ||
    [".zip", ".rar", ".7z", ".tar", ".gz", ".bz2"].includes(ext)
  ) {
    category = "archive";
  }
  // Fuentes
  else if (mime.startsWith("font/") || [".ttf", ".otf", ".woff", ".woff2"].includes(ext)) {
    category = "design";
  }
  // eBooks
  else if (mime.includes("epub") || mime.includes("mobipocket") || [".epub", ".mobi"].includes(ext)) {
    category = "text";
  }

  documentInfo.category = category;

  // Intentar extraer metadatos específicos según tipo
  try {
    if (mime.startsWith("image/") && mime !== "image/svg+xml") {
      const metadata = await sharp(file.path).metadata();
      documentInfo.width = metadata.width;
      documentInfo.height = metadata.height;
      documentInfo.format = metadata.format;
      documentInfo.hasAlpha = metadata.hasAlpha;
      documentInfo.space = metadata.space;
    }

    // Para archivos de texto, contar líneas y palabras
    if (mime.startsWith("text/") || mime === "application/json") {
      const content = fs.readFileSync(file.path, "utf-8");
      const lines = content.split("\n").length;
      const words = content.split(/\s+/).filter((word) => word.length > 0).length;
      documentInfo.lineCount = lines;
      documentInfo.wordCount = words;
    }
  } catch (error) {
    console.log("⚠️ No se pudieron extraer metadatos adicionales:", error);
  }

  (file as any).documentInfo = documentInfo;

  console.log("📊 Metadatos del documento:", {
    filename: file.originalname,
    mimeType: documentInfo.mimeType,
    category: documentInfo.category,
    size: documentInfo.size,
    ...(documentInfo.width && { dimensions: `${documentInfo.width}x${documentInfo.height}` }),
    ...(documentInfo.lineCount && { lines: documentInfo.lineCount }),
    ...(documentInfo.wordCount && { words: documentInfo.wordCount }),
  });
};

// ✅ FUNCIÓN PARA CREAR VERSIONES DE IMAGEN DE PERFIL
const createProfileImageVersions = async (file: Express.Multer.File): Promise<void> => {
  if (!file.mimetype.startsWith("image/")) return;

  const fileDir = path.dirname(file.path);
  const fileName = path.basename(file.path, path.extname(file.path));

  // Crear versión grande (500x500)
  const largePath = path.join(fileDir, `${fileName}-large.jpg`);
  await sharp(file.path)
    .resize(500, 500, {
      fit: "cover",
      position: "center",
    })
    .jpeg({ quality: 90 })
    .toFile(largePath);

  // Crear versión mediana (200x200)
  const mediumPath = path.join(fileDir, `${fileName}-medium.jpg`);
  await sharp(file.path)
    .resize(200, 200, {
      fit: "cover",
      position: "center",
    })
    .jpeg({ quality: 85 })
    .toFile(mediumPath);

  // Crear versión pequeña/thumbnail (80x80)
  const thumbPath = path.join(fileDir, `${fileName}-thumb.jpg`);
  await sharp(file.path)
    .resize(80, 80, {
      fit: "cover",
      position: "center",
    })
    .jpeg({ quality: 80 })
    .toFile(thumbPath);

  // Agregar paths al objeto file
  (file as any).largePath = largePath;
  (file as any).mediumPath = mediumPath;
  (file as any).thumbPath = thumbPath;

  console.log("✅ Versiones de imagen de perfil creadas:", {
    largePath,
    mediumPath,
    thumbPath,
  });
};

// ✅ FUNCIÓN PARA CREAR THUMBNAILS DE IMÁGENES
const createImageThumbnails = async (file: Express.Multer.File): Promise<void> => {
  if (!file.mimetype.startsWith("image/")) return;

  const fileDir = path.dirname(file.path);
  const fileName = path.basename(file.path, path.extname(file.path));

  // Crear directorio de thumbnails si no existe
  const thumbnailsDir = path.join(fileDir, "thumbnails");
  if (!fs.existsSync(thumbnailsDir)) {
    fs.mkdirSync(thumbnailsDir, { recursive: true });
  }

  // Crear thumbnail (300x300)
  const thumbnailPath = path.join(thumbnailsDir, `${fileName}-thumb.jpg`);
  await sharp(file.path)
    .resize(300, 300, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 80 })
    .toFile(thumbnailPath);

  // Crear tamaño medio (800x600)
  const mediumDir = path.join(fileDir, "medium");
  if (!fs.existsSync(mediumDir)) {
    fs.mkdirSync(mediumDir, { recursive: true });
  }

  const mediumPath = path.join(mediumDir, `${fileName}-medium.jpg`);
  await sharp(file.path)
    .resize(800, 600, {
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({ quality: 85 })
    .toFile(mediumPath);

  // Agregar paths al objeto file
  (file as any).thumbnailPath = thumbnailPath;
  (file as any).mediumPath = mediumPath;

  console.log("✅ Thumbnails creados:", { thumbnailPath, mediumPath });
};

// ✅ FUNCIÓN HELPER PARA CREAR DIRECTORIOS DE USUARIO
export const createUserDirectories = (userId: number): void => {
  const basePath = path.join(process.cwd(), "uploads", userId.toString());
  const directories = [
    path.join(basePath, "images"),
    path.join(basePath, "images", "thumbnails"),
    path.join(basePath, "images", "medium"),
    path.join(basePath, "videos"),
    path.join(basePath, "profile"),
    path.join(basePath, "documents"),
  ];

  directories.forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log("📁 Directorio creado:", dir);
    }
  });
};

// ✅ FUNCIÓN PARA OBTENER LA RUTA PÚBLICA DE DOCUMENTOS
export const getDocumentPublicPath = (userId: number, filename: string): string => {
  return `/uploads/${userId}/documents/${filename}`;
};

// ✅ FUNCIÓN PARA OBTENER LA RUTA PÚBLICA DE LA IMAGEN DE PERFIL
export const getProfileImagePublicPath = (userId: number, filename: string): string => {
  return `/uploads/${userId}/profile/${filename}`;
};

// ✅ FUNCIÓN PARA ELIMINAR DOCUMENTOS ANTERIORES
export const cleanupOldDocuments = async (userId: number, keepFilenames?: string[]): Promise<void> => {
  try {
    const documentsDir = path.join(process.cwd(), "uploads", userId.toString(), "documents");

    if (!fs.existsSync(documentsDir)) {
      return;
    }

    const files = fs.readdirSync(documentsDir);
    const keepSet = new Set(keepFilenames || []);

    for (const file of files) {
      if (keepSet.has(file)) continue;

      const filePath = path.join(documentsDir, file);
      try {
        fs.unlinkSync(filePath);
        console.log("🧹 Documento anterior eliminado:", filePath);
      } catch (error) {
        console.error("❌ Error eliminando documento anterior:", filePath, error);
      }
    }
  } catch (error) {
    console.error("❌ Error en limpieza de documentos:", error);
  }
};

// ✅ FUNCIÓN PARA ELIMINAR IMÁGENES DE PERFIL ANTERIORES
export const cleanupOldProfileImages = async (userId: number, keepFilename?: string): Promise<void> => {
  try {
    const profileDir = path.join(process.cwd(), "uploads", userId.toString(), "profile");

    if (!fs.existsSync(profileDir)) {
      return;
    }

    const files = fs.readdirSync(profileDir);

    for (const file of files) {
      if (keepFilename && file === keepFilename) continue;

      const filePath = path.join(profileDir, file);
      try {
        fs.unlinkSync(filePath);
        console.log("🧹 Imagen de perfil anterior eliminada:", filePath);
      } catch (error) {
        console.error("❌ Error eliminando imagen de perfil anterior:", filePath, error);
      }
    }
  } catch (error) {
    console.error("❌ Error en limpieza de imágenes de perfil:", error);
  }
};

// ✅ FUNCIÓN PARA LIMPIAR ARCHIVOS TEMPORALES
export const cleanTempFiles = (files: Express.Multer.File[]): void => {
  files.forEach((file) => {
    if (fs.existsSync(file.path)) {
      try {
        fs.unlinkSync(file.path);
        console.log("🧹 Archivo temporal eliminado:", file.path);
      } catch (error) {
        console.error("❌ Error eliminando archivo temporal:", file.path, error);
      }
    }
  });
};

// ✅ MIDDLEWARE DE MANEJO DE ERRORES MEJORADO (ACTUALIZADO PARA 3GB)
export const handleUploadError = (error: any, req: Request, res: Response, next: NextFunction) => {
  console.error("💥 Error en middleware de upload:", error);

  // Log detallado del error
  if (error instanceof multer.MulterError) {
    console.error("🔍 Detalles del error Multer:", {
      code: error.code,
      field: error.field,
      message: error.message,
    });

    switch (error.code) {
      case "LIMIT_FILE_SIZE":
        const isVideo = req.file?.mimetype?.startsWith("video/") || error.message.includes("video");
        const isProfile = req.file?.mimetype?.startsWith("image/") || error.message.includes("profile");
        const isDocument =
          error.message.includes("document") ||
          req.file?.mimetype?.includes("document") ||
          req.file?.mimetype?.includes("pdf");

        let maxSize: number;
        if (isProfile) {
          maxSize = 50 * 1024 * 1024; // 50MB para perfil
        } else {
          maxSize = 3 * 1024 * 1024 * 1024; // 3GB para todo lo demás
        }

        return res.status(413).json({
          success: false,
          error: `El archivo es demasiado grande. Tamaño máximo: ${(maxSize / (1024 * 1024 * 1024)).toFixed(1)}GB`,
          maxSizeGB: (maxSize / (1024 * 1024 * 1024)).toFixed(1),
          fileType: isVideo ? "video" : isDocument ? "document" : isProfile ? "profile" : "image",
        });

      case "LIMIT_FILE_COUNT":
        return res.status(400).json({
          success: false,
          error: "Demasiados archivos enviados",
          maxFiles: error.message.includes("image") ? 10 : error.message.includes("video") ? 5 : 10,
        });

      case "LIMIT_UNEXPECTED_FILE":
        return res.status(400).json({
          success: false,
          error: `Campo de archivo inesperado: "${error.field}". Campos permitidos: 'image', 'file', 'video', 'document', 'profileImage'`,
          receivedField: error.field,
          allowedFields: [
            "image",
            "file",
            "video",
            "document",
            "profileImage",
            "images",
            "videos",
            "documents",
            "files",
          ],
        });

      case "LIMIT_PART_COUNT":
        return res.status(400).json({
          success: false,
          error: "Demasiadas partes en la solicitud",
        });

      default:
        return res.status(400).json({
          success: false,
          error: `Error Multer: ${error.message}`,
          code: error.code,
        });
    }
  }

  // Errores de validación personalizados
  if (error.message.includes("Tipo de archivo no permitido")) {
    return res.status(400).json({
      success: false,
      error: error.message,
      allowedTypes: ALLOWED_MIME_TYPES,
    });
  }

  if (error.message.includes("Usuario no autenticado")) {
    return res.status(401).json({
      success: false,
      error: "Debe autenticarse para subir archivos",
    });
  }

  // Error de conversión HEIC
  if (error.message.includes("Error convirtiendo HEIC a JPEG")) {
    return res.status(500).json({
      success: false,
      error: "Error procesando imagen HEIC. Intenta convertirla a JPEG primero.",
    });
  }

  // Error genérico
  console.error("🔥 Error no manejado en upload:", {
    message: error.message,
    stack: error.stack,
    body: req.body,
    files: req.file || req.files,
  });

  res.status(500).json({
    success: false,
    error: "Error interno del servidor al procesar el archivo",
    ...(process.env.NODE_ENV === "development" && { details: error.message }),
  });
};

// ✅ MIDDLEWARE DE DEBUG PARA VER CAMPOS RECIBIDOS
export const debugUpload = (req: Request, res: Response, next: NextFunction) => {
  console.log("🔍 DEBUG Upload - Headers:", {
    "content-type": req.headers["content-type"],
    authorization: req.headers.authorization ? "PRESENT" : "MISSING",
  });

  console.log("🔍 DEBUG Upload - Body keys:", Object.keys(req.body));

  if (req.file) {
    console.log("🔍 DEBUG Upload - File:", {
      fieldname: req.file.fieldname,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });
  }

  if (req.files) {
    console.log(
      "🔍 DEBUG Upload - Files:",
      Array.isArray(req.files) ? `Array with ${req.files.length} files` : Object.keys(req.files as object),
    );
  }

  next();
};

// Exportaciones por defecto (para compatibilidad)
export const uploadSingle = uploadSingleImage;
export const uploadMultiple = uploadMultipleImages;

export default uploadImage;