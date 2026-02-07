import { Router } from "express";
import TeamController from "../controllers/team.controller.js";
import { uploadSingle } from "../middleware/upload.middleware.js";
import { requireAuth, requireAdmin } from "../middleware/auth.middleware.js";

const router = Router();

// Public routes
router.get("/", TeamController.getAllTeams);
router.get("/:id", TeamController.getTeamById);

// Protected routes (Admin only)
router.post(
  "/",
  requireAuth,
  requireAdmin,
  uploadSingle,
  TeamController.createTeam,
);

router.put(
  "/:id",
  requireAuth,
  requireAdmin,
  uploadSingle,
  TeamController.updateTeam,
);

router.delete("/:id", requireAuth, requireAdmin, TeamController.deleteTeam);

export default router;
