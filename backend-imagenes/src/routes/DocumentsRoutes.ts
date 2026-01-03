import auth from "@src/middleware/auth";
import { Router } from "express";
import * as DocumentService from "@src/services/DocumentService";
import { uploadSingleDocument } from "@src/middleware/multer";

const router = Router();
router.use(auth);

// ============================================================================
// 📤 SUBIR DOCUMENTO
// ============================================================================
router.post("/upload", uploadSingleDocument, DocumentService.uploadDocument);

// ============================================================================
// 📊 ESTADÍSTICAS Y BÚSQUEDA (sin parámetros variables)
// ============================================================================
router.get("/stats", DocumentService.getDocumentStats);
router.get("/search", DocumentService.searchDocuments);

// ============================================================================
// 📂 RUTAS ESPECÍFICAS CON TEXTO FIJO (antes de :id)
// ============================================================================
router.get("/category/:category", DocumentService.getDocumentsByCategory);

// ============================================================================
// 📄 RUTAS CON :id ESPECÍFICAS (más restrictivas primero)
// ============================================================================
router.get("/:id/file", DocumentService.serveDocument);
router.get("/:id/download", DocumentService.downloadDocument);
router.get("/:id/preview", DocumentService.previewDocument);
router.get("/:id/preview-url", DocumentService.getPreviewUrl);
router.get("/:id/open", DocumentService.openDocument);

// ============================================================================
// ✏️ ACCIONES PATCH/PUT (antes del GET genérico)
// ============================================================================
router.patch("/:id/favorite", DocumentService.toggleFavorite);
router.put("/:id", DocumentService.updateDocument);
router.patch("/:id", DocumentService.updateDocument);

// ============================================================================
// 🗑️ DELETE
// ============================================================================
router.delete("/:id", DocumentService.deleteDocument);

// ============================================================================
// 📁 CRUD BÁSICO (al final)
// ============================================================================
router.get("/", DocumentService.getUserDocuments);          // Lista todos
router.post("/", DocumentService.createDocumentMetadata);   // Crear metadatos
router.get("/:id", DocumentService.getDocumentById);        // Get uno (DEBE IR AL FINAL)

export default router;