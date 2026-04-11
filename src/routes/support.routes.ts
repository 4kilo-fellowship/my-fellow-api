import { Router } from "express";
import { SupportController } from "../controllers/support.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { uploadSingle } from "../middleware/upload.middleware.js";

const router = Router();

router.post("/", requireAuth, uploadSingle, SupportController.createTicket);

export default router;
