import { Router } from "express";
import { AuthController } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { uploadSingle } from "../middleware/upload.middleware.js";
import { handleMulterError } from "../middleware/multerError.middleware.js";

const router = Router();

router.post("/signup", uploadSingle, handleMulterError, AuthController.register);
router.post("/signin", AuthController.login);
router.get("/me", requireAuth, AuthController.getMe);

export default router;
