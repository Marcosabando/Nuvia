// src/routes/ImageRoutes.ts
import { Router } from "express";
import auth from "@src/middleware/auth";
import { uploadMultiple, uploadSingle } from "@src/middleware/multer";
import * as ImageService from "@src/services/ImageService";

const router = Router();

// ============================================================================
// 🔒 TODAS LAS RUTAS REQUIEREN AUTENTICACIÓN
// ============================================================================
router.use(auth);

// ============================================================================
// 📤 UPLOAD - Subir imágenes
// ============================================================================

/**
 * Subir una imagen individual
 * POST /api/images/upload
 * Body (multipart/form-data):
 *   - file: imagen (required)
 *   - title: título opcional
 *   - description: descripción opcional
 */
router.post("/upload", uploadSingle, ImageService.uploadImage);

/**
 * Subir múltiples imágenes
 * POST /api/images/upload-multiple
 * Body (multipart/form-data):
 *   - files: array de imágenes
 */
router.post("/upload-multiple", uploadMultiple, ImageService.uploadMultipleImages);

// ============================================================================
// 📊 ESTADÍSTICAS - Debe ir ANTES de /:id para evitar conflictos
// ============================================================================

/**
 * Obtener estadísticas de imágenes
 * GET /api/images/stats
 */
router.get("/stats", ImageService.getImageStats);

// ============================================================================
// 🔍 BÚSQUEDA Y FILTROS
// ============================================================================

/**
 * Buscar imágenes
 * GET /api/images/search?q=query&page=1&limit=20
 */
router.get("/search", ImageService.searchImages);

/**
 * Obtener imágenes recientes
 * GET /api/images/recent?limit=10
 */
router.get("/recent", ImageService.getRecentImages);

/**
 * Obtener imágenes eliminadas (papelera)
 * GET /api/images/deleted?page=1&limit=20
 */
router.get("/deleted", ImageService.getDeletedImages);

// ============================================================================
// 📋 OBTENER IMÁGENES
// ============================================================================

/**
 * Obtener todas las imágenes del usuario
 * GET /api/images?page=1&limit=20&favorites=true
 * Query params:
 *   - page: número de página (default: 1)
 *   - limit: imágenes por página (default: 20)
 *   - favorites: true/false para filtrar favoritas
 */
router.get("/", ImageService.getUserImages);

/**
 * Obtener imagen por ID
 * GET /api/images/:id
 */
router.get("/:id", ImageService.getImageById);

// ============================================================================
// ✏️ ACTUALIZAR - Metadatos de imágenes
// ============================================================================

/**
 * Actualizar título de imagen
 * PATCH /api/images/:id/title
 * Body: { title: string }
 */
router.patch("/:id/title", ImageService.updateImageTitle);

/**
 * Actualizar descripción de imagen
 * PATCH /api/images/:id/description
 * Body: { description: string }
 */
router.patch("/:id/description", ImageService.updateImageDescription);

/**
 * Actualizar metadatos de imagen
 * PATCH /api/images/:id/metadata
 * Body: {
 *   width?: number,
 *   height?: number,
 *   location?: string,
 *   takenDate?: string,
 *   cameraInfo?: string
 * }
 */
router.patch("/:id/metadata", ImageService.updateImageMetadata);

// ============================================================================
// ⭐ FAVORITOS
// ============================================================================

/**
 * Toggle favorito (añadir/quitar)
 * POST /api/images/:id/favorite
 */
router.post("/:id/favorite", ImageService.toggleImageFavorite);

// ============================================================================
// 🔓 VISIBILIDAD PÚBLICA/PRIVADA
// ============================================================================

/**
 * Toggle público/privado
 * POST /api/images/:id/toggle-public
 */
router.post("/:id/toggle-public", ImageService.toggleImagePublic);

// ============================================================================
// 🗑️ PAPELERA (SOFT DELETE)
// ============================================================================

/**
 * Restaurar imagen desde papelera
 * POST /api/images/:id/restore
 */
router.post("/:id/restore", ImageService.restoreImage);

/**
 * Mover imagen a papelera (soft delete)
 * DELETE /api/images/:id
 */
router.delete("/:id", ImageService.softDeleteImage);

/**
 * Eliminar imagen permanentemente
 * DELETE /api/images/:id/permanent
 * ⚠️ ACCIÓN IRREVERSIBLE
 */
router.delete("/:id/permanent", ImageService.deleteImagePermanently);

// ============================================================================
// EXPORTAR ROUTER
// ============================================================================
export default router;