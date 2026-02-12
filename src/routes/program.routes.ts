import { Router } from "express";
import ProgramController from "../controllers/program.controller.js";
import { uploadSingle } from "../middleware/upload.middleware.js";
import { requireAuth, requireAdmin } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", ProgramController.getAllPrograms);
router.get("/:id", ProgramController.getProgramById);

router.post(
  "/",
  requireAuth,
  requireAdmin,
  uploadSingle,
  ProgramController.createProgram,
);

router.put(
  "/:id",
  requireAuth,
  requireAdmin,
  uploadSingle,
  ProgramController.updateProgram,
);

router.delete(
  "/:id",
  requireAuth,
  requireAdmin,
  ProgramController.deleteProgram,
);

export default router;
