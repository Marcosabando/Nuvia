// src/routes/videos.ts
import auth from "@src/middleware/auth";
import { Router } from "express";
import * as VideoService from "@src/services/VideoService";
import { uploadSingle } from "@src/middleware/multer";
const router = Router();
// ============================================================================
// 🔒 TODAS LAS RUTAS REQUIEREN AUTENTICACIÓN
// ============================================================================

router.use(auth);

// ============================================================================
// 📤 UPLOAD - Subir videos
// ============================================================================ 

router.post("/upload",uploadSingle, VideoService.uploadVideo);
router.post("/upload-multiple", VideoService.uploadMultipleVideos);

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
router.get("/:id", VideoService.getVideoById);

// ============================================================================
// 🗑️ ELIMINAR / RESTAURAR VIDEOS
// ============================================================================

router.delete("/:id", VideoService.deleteVideo);
router.patch("/:id/soft-delete", VideoService.softDeleteVideo);
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
