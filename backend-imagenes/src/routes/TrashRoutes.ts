import { Router } from "express";
import auth from "@src/middleware/auth";
import * as TrashService from "@src/services/TrashService";

const router = Router();

// ============================================================================
// 🔒 TODAS LAS RUTAS REQUIEREN AUTENTICACIÓN
// ============================================================================
router.use(auth);

// ============================================================================
// 📊 ESTADÍSTICAS
// ============================================================================
router.get("/stats", TrashService.getTrashStats);

// ============================================================================
// ♻️ RESTAURAR MÚLTIPLES ELEMENTOS
// ============================================================================
router.post("/restore-multiple", TrashService.restoreMultipleItems);

// ============================================================================
// 🗑️ VACIAR PAPELERA (eliminar todo)
// ============================================================================
router.delete("/empty", TrashService.emptyTrash);

// ============================================================================
// 📋 OBTENER ELEMENTOS EN PAPELERA
// ============================================================================
router.get("/", TrashService.getTrashItems);

// ============================================================================
// ♻️ RESTAURAR ELEMENTO INDIVIDUAL
// ============================================================================
router.post("/:id/restore", TrashService.restoreItem);

// ============================================================================
// 🔥 ELIMINAR PERMANENTEMENTE ELEMENTO INDIVIDUAL
// ============================================================================
router.delete("/:id", TrashService.deleteItemPermanently);

export default router;