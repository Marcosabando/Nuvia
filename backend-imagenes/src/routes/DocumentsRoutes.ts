// src/routes/DocumentsRoutes.ts
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
// 📤 SUBIR DOCUMENTO - Debe ir ANTES de rutas con parámetros
// ============================================================================

router.post("/upload", uploadSingleDocument, DocumentService.createDocument);

// ============================================================================
// 📊 ESTADÍSTICAS - Debe ir ANTES de rutas con parámetros
// ============================================================================

router.get("/stats", DocumentService.getDocumentStats);

// ============================================================================
// 🔍 BUSCAR DOCUMENTOS - Debe ir ANTES de rutas con parámetros
// ============================================================================

router.get("/search", DocumentService.searchDocuments);

// ============================================================================
// 📁 OBTENER TODOS LOS DOCUMENTOS
// ============================================================================

router.get("/", DocumentService.getUserDocuments);

// ============================================================================
// 🆕 CREAR DOCUMENTO (METADATOS)
// ============================================================================

router.post("/", DocumentService.createDocument);

// ============================================================================
// 📂 DOCUMENTOS POR CATEGORÍA
// ============================================================================

router.get("/category/:category", DocumentService.getDocumentsByCategory);

// ============================================================================
// 👤 DOCUMENTOS ESPECÍFICOS (RUTAS CON PARÁMETROS)
// ============================================================================

// ============================================================================
// 📄 OBTENER DOCUMENTO POR ID
// ============================================================================

router.get("/:id", DocumentService.getDocumentById);

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

export default router;