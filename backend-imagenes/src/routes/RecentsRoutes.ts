// 📂 UBICACIÓN: src/routes/RecentsRoutes.ts

import auth from "@src/middleware/auth";
import { Router } from "express";
import * as RecentsService from "@src/services/RecentsService";

const router = Router();

// ============================================================================
// 🔒 TODAS LAS RUTAS REQUIEREN AUTENTICACIÓN
// ============================================================================
router.use(auth);

// ============================================================================
// 📊 ESTADÍSTICAS - Debe ir ANTES de otros endpoints
// ============================================================================
router.get("/stats", RecentsService.getRecentStats);

// ============================================================================
// 📋 OBTENER ITEMS RECIENTES (imágenes + videos)
// ============================================================================
router.get("/", RecentsService.getRecentItems);

// ============================================================================
// 🔍 FILTROS ESPECÍFICOS POR TIPO
// ============================================================================
router.get("/images", RecentsService.getRecentImages);
router.get("/videos", RecentsService.getRecentVideos);

// ============================================================================
// 📈 ANÁLISIS Y REPORTES
// ============================================================================
router.get("/timeline", RecentsService.getTimeline);
router.get("/most-viewed", RecentsService.getMostViewed);

export default router;