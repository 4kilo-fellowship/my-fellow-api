import { Router } from "express";
import ProgramController from "../controllers/program.controller.js";
import { uploadSingle } from "../middleware/upload.middleware.js";
import { requireAuth, requirePermission } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", ProgramController.getAllPrograms);
router.get("/:id", ProgramController.getProgramById);

router.post(
  "/",
  requireAuth,
  requirePermission("announcements.publish"),
  uploadSingle,
  ProgramController.createProgram,
);

router.put(
  "/:id",
  requireAuth,
  requirePermission("announcements.publish"),
  uploadSingle,
  ProgramController.updateProgram,
);

router.delete(
  "/:id",
  requireAuth,
  requirePermission("announcements.publish"),
  ProgramController.deleteProgram,
);

export default router;
