// src/routes/videos.ts
import router from "./auth";
import auth from "@src/middleware/auth";
import * as VideoService from "@src/services/VideoService";

// ============================================================================
// 🔒 TODAS LAS RUTAS REQUIEREN AUTENTICACIÓN
// ============================================================================

router.use(auth);

// ============================================================================
// 📤 UPLOAD - Subir videos
// ============================================================================ 

/**
 * Subir un video individual
 * POST /api/videos/upload 
 * Body (multipart/form-data):
 *   - file: video (required)
 *   - title: título opcional
 *   - description: descripción opcional
 */
router.post("/upload", VideoService.uploadVideo);

/**
 * Subir múltiples videos
 * POST /api/videos/upload-multiple     
 * Body (multipart/form-data):
 *   - files: array de videos
 */
router.post("/upload-multiple", VideoService.uploadMultipleVideos);

// ============================================================================
// 📊 ESTADÍSTICAS - Debe ir ANTES de /:id para evitar conflictos
// ============================================================================

/**
 * Obtener estadísticas de videos
 * GET /api/videos/stats
 */
router.get("/stats", VideoService.getVideoStats);

// ============================================================================
// 🔍 BÚSQUEDA Y FILTROS
// ============================================================================

/**
 * Buscar videos
 * GET /api/videos/search?q=query&page=1&limit=20
 */
router.get("/search", VideoService.searchVideos);

/**
 * Obtener videos recientes
 * GET /api/videos/recent?limit=10
 */
router.get("/recent", VideoService.getRecentVideos);

/**
 * Obtener videos eliminados (papelera)
 * GET /api/videos/deleted?page=1&limit=20
 */
router.get("/deleted", VideoService.getDeletedVideos);

// ============================================================================
// 📋 OBTENER VIDEOS
// ============================================================================   

/**
 * Obtener todos los videos del usuario con paginación
 * GET /api/videos?page=1&limit=20
 */
router.get("/", VideoService.getUserVideos);

/**
 * Obtener un video por ID
 * GET /api/videos/:id
 */
router.get("/:id", VideoService.getVideoById);

// ============================================================================
// 🗑️ ELIMINAR / RESTAURAR VIDEOS
// ============================================================================

/**
 * Eliminar un video definitivamente
 * DELETE /api/videos/:id
 */
router.delete("/:id", VideoService.deleteVideo);

/**
 * Mover un video a la papelera (soft delete)
 * PATCH /api/videos/:id/soft-delete
 */
router.patch("/:id/soft-delete", VideoService.softDeleteVideo);

/**
 * Restaurar un video de la papelera
 * PATCH /api/videos/:id/restore
 */
router.patch("/:id/restore", VideoService.restoreVideo);

// ============================================================================
// ✏️ ACTUALIZAR INFORMACIÓN DEL VIDEO
// ============================================================================

/**
 * Actualizar el título de un video
 * PATCH /api/videos/:id/title
 * Body: { title: "Nuevo título" }
 */
router.patch("/:id/title", VideoService.updateVideoTitle);

/**
 * Actualizar la descripción de un video
 * PATCH /api/videos/:id/description
 * Body: { description: "Nueva descripción" }
 */
router.patch("/:id/description", VideoService.updateVideoDescription);

/**
 * Actualizar metadatos del video (duración, resolución, fps, etc.)
 * PATCH /api/videos/:id/metadata
 * Body: { duration, width, height, fps, bitrate, codec }
 */
router.patch("/:id/metadata", VideoService.updateVideoMetadata);

// ============================================================================
// ⭐ FAVORITOS
// ============================================================================

/**
 * Marcar o desmarcar video como favorito
 * PATCH /api/videos/:id/favorite
 */
router.patch("/:id/favorite", VideoService.toggleVideoFavorite);

export default router;
