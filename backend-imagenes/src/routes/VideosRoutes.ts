// src/routes/videos.ts - VERSIÓN CORREGIDA
import auth from "@src/middleware/auth";
import { Router } from "express";
import * as VideoService from "@src/services/VideoService";
import * as TrashService from "@src/services/TrashService";
import { uploadSingleVideo, uploadMultipleVideos } from "@src/middleware/multer";

const router = Router();

// ============================================================================
// 🔒 TODAS LAS RUTAS REQUIEREN AUTENTICACIÓN
// ============================================================================

router.use(auth);

// ============================================================================
// 📤 UPLOAD - Subir videos
// ============================================================================ 

// ✅ CORREGIDO: Cambiar uploadSingleVideo a .single('video') si el frontend usa "video"
// o a .single('file') si el frontend usa "file"
router.post("/upload", 
  (req, res, next) => {
    console.log("🎬 Iniciando upload de video...");
    console.log("🔍 Content-Type:", req.headers["content-type"]);
    console.log("🔍 Method:", req.method);
    console.log("🔍 URL:", req.url);
    next();
  },
  uploadSingleVideo, 
  VideoService.uploadVideo
);

router.post("/upload-multiple", uploadMultipleVideos, VideoService.uploadMultipleVideos);

// ============================================================================
// 📊 ESTADÍSTICAS - Debe ir ANTES de /:id para evitar conflictos
// ============================================================================

router.get("/stats", VideoService.getVideoStats);

// ============================================================================
// 🔍 BÚSQUEDA Y FILTROS
// ============================================================================

router.get("/search", VideoService.searchVideos);
router.get("/recent", VideoService.getRecentVideos);
router.get("/deleted", VideoService.getDeletedVideos);

// ============================================================================
// 📋 OBTENER VIDEOS
// ============================================================================   

router.get("/", VideoService.getUserVideos);
router.get("/user/:userId", VideoService.getVideosByUser);
router.get("/:id", VideoService.getVideoById);

// ============================================================================
// 🗑️ ELIMINAR / RESTAURAR VIDEOS
// ============================================================================

router.delete("/:id", VideoService.deleteVideo); // Hard delete
router.patch("/:id/soft-delete", VideoService.softDeleteVideo); // Soft delete (usar VideoService, no TrashService)
router.patch("/:id/restore", VideoService.restoreVideo);

// ============================================================================
// ✏️ ACTUALIZAR INFORMACIÓN DEL VIDEO
// ============================================================================

router.patch("/:id/title", VideoService.updateVideoTitle);
router.patch("/:id/description", VideoService.updateVideoDescription);
router.patch("/:id/metadata", VideoService.updateVideoMetadata);

// ============================================================================
// ⭐ FAVORITOS
// ============================================================================

router.patch("/:id/favorite", VideoService.toggleVideoFavorite);

export default router;