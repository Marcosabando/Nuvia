// 📁 src/routes/DocumentsRoutes.ts - VERSIÓN COMPLETA Y CORREGIDA
import auth from "@src/middleware/auth";
import { Router } from "express";
import * as DocumentService from "@src/services/DocumentService";
import { uploadSingleDocument } from "@src/middleware/multer";

const router = Router();

// ============================================================================
// 🔒 TODAS LAS RUTAS REQUIEREN AUTENTICACIÓN
// ============================================================================
router.use(auth);

// ============================================================================
// 📤 SUBIR DOCUMENTO CON ARCHIVO
// ============================================================================
router.post("/upload", uploadSingleDocument, DocumentService.uploadDocument);

// ============================================================================
// 📊 ESTADÍSTICAS
// ============================================================================
router.get("/stats", DocumentService.getDocumentStats);

// ============================================================================
// 🔍 BUSCAR DOCUMENTOS
// ============================================================================
router.get("/search", DocumentService.searchDocuments);

// ============================================================================
// 📁 OBTENER TODOS LOS DOCUMENTOS DEL USUARIO
// ============================================================================
router.get("/", DocumentService.getUserDocuments);

// ============================================================================
// 📂 DOCUMENTOS POR CATEGORÍA
// ============================================================================
router.get("/category/:category", DocumentService.getDocumentsByCategory);

// ============================================================================
// 🆕 CREAR DOCUMENTO (SOLO METADATOS - SIN ARCHIVO)
// ============================================================================
router.post("/", DocumentService.createDocumentMetadata);

// ============================================================================
// 📄 OBTENER DOCUMENTO POR ID
// ============================================================================
router.get("/:id", DocumentService.getDocumentById);

// ============================================================================
// 📥 DESCARGAR DOCUMENTO
// ============================================================================
router.get("/:id/download", DocumentService.downloadDocument);

// ============================================================================
// 👁️ PREVISUALIZAR DOCUMENTO (¡ESTA ES LA QUE FALTA!)
// ============================================================================
router.get("/:id/preview", DocumentService.previewDocument); // ✅ AÑADIR ESTA LÍNEA

// ============================================================================
// ✏️ ACTUALIZAR DOCUMENTO
// ============================================================================
router.put("/:id", DocumentService.updateDocument);
router.patch("/:id", DocumentService.updateDocument);

// ============================================================================
// ⭐ MARCAR/DESMARCAR COMO FAVORITO
// ============================================================================
router.patch("/:id/favorite", DocumentService.toggleFavorite);

// ============================================================================
// 🗑️ ELIMINAR DOCUMENTO
// ============================================================================
router.delete("/:id", DocumentService.deleteDocument);

// Ruta principal de preview
router.get("/:id/preview", DocumentService.previewDocument);

// Ruta alternativa para obtener URL de preview
router.get("/:id/preview-url", DocumentService.getPreviewUrl);

// Ruta para abrir en nueva pestaña
router.get("/:id/open", DocumentService.openDocument);

// Ruta de descarga
router.get("/:id/download", DocumentService.downloadDocument);

router.get("/view/:id", DocumentService.previewDocument); // Alias
router.get("/open/:id", DocumentService.openDocument);

export default router;