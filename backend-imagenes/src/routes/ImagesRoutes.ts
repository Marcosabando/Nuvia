import { Router } from "express";
import  auth from "@src/middleware/auth"; // tu middleware JWT
import { uploadMultiple, uploadSingle } from "@src/middleware/multer"; // tu config de multer
import * as ImageService from "@src/services/ImageService";

const router = Router();
router.use(auth);
router.post("/upload", auth, uploadSingle, ImageService.uploadImage);
router.post("/upload-multiple", uploadMultiple, ImageService.uploadMultipleImages);
router.get("/", ImageService.getUserImages);
router.get("/:id", ImageService.getImageById);
router.delete("/:id", ImageService.deleteImage);
export default router;