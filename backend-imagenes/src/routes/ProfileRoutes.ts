// src/routes/profile.ts
import auth from "@src/middleware/auth";
import { Router } from "express";
import * as ProfileService from "@src/services/ProfileServices";
import { uploadSingleProfileImage } from "@src/middleware/multer";

const router = Router();

// ============================================================================
// 🔒 TODAS LAS RUTAS REQUIEREN AUTENTICACIÓN
// ============================================================================

router.use(auth);

// ============================================================================
// 📤 IMAGEN DE PERFIL - Subir/actualizar imagen
// ============================================================================

router.post("/image", uploadSingleProfileImage, ProfileService.updateProfileImage);

// ============================================================================
// 📊 ESTADÍSTICAS - Debe ir ANTES de rutas con parámetros
// ============================================================================

router.get("/stats", ProfileService.getUserStats);

// ============================================================================
// 👤 OBTENER PERFIL
// ============================================================================

router.get("/", ProfileService.getUserProfile);

// ============================================================================
// ✏️ ACTUALIZAR INFORMACIÓN DEL PERFIL
// ============================================================================

router.put("/", ProfileService.updateUserProfile);
router.patch("/username", ProfileService.updateUsername);
router.patch("/email", ProfileService.updateEmail);
router.patch("/bio", ProfileService.updateBio);
router.patch("/location", ProfileService.updateLocation);

// ============================================================================
// 🔐 CONFIGURACIÓN DE CUENTA
// ============================================================================

router.patch("/password", ProfileService.updatePassword);
router.patch("/theme", ProfileService.updateTheme);
router.patch("/language", ProfileService.updateLanguage);

// ============================================================================
// ❌ ELIMINAR CUENTA
// ============================================================================

router.delete("/", ProfileService.deleteAccount);

export default router;