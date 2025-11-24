// src/routes/folders.ts
import auth from "@src/middleware/auth";
import { Router } from "express";
import * as FolderService from "@src/services/FolderService";

const router = Router();

// ============================================================================
// 🔒 TODAS LAS RUTAS REQUIEREN AUTENTICACIÓN
// ============================================================================
router.use(auth);

// ============================================================================
// 📋 OBTENER CARPETAS
// ============================================================================
router.get("/", FolderService.getUserFolders);
router.get("/:id", FolderService.getFolderById);
router.get("/:id/content", FolderService.getFolderContent);

// ============================================================================
// 🆕 CREAR CARPETA
// ============================================================================
router.post("/", FolderService.createFolder);

// ============================================================================
// ✏️ ACTUALIZAR CARPETA
// ============================================================================
router.patch("/:id", FolderService.updateFolder);

// ============================================================================
// 🗑️ ELIMINAR CARPETA
// ============================================================================
router.delete("/:id", FolderService.deleteFolder);

// ============================================================================
// 📁 GESTIONAR CONTENIDO DE CARPETAS
// ============================================================================
router.post("/:id/images", FolderService.addImageToFolder);
router.delete("/:id/images/:imageId", FolderService.removeImageFromFolder);

router.post("/:id/videos", FolderService.addVideoToFolder);
router.delete("/:id/videos/:videoId", FolderService.removeVideoFromFolder);

export default router;