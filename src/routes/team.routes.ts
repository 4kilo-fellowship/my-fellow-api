import { Router } from "express";
import TeamController from "../controllers/team.controller.js";
import { upload } from "../middleware/upload.middleware.js";
import { requireAuth, requireAdmin } from "../middleware/auth.middleware.js";

const router = Router();

const uploadTeamPhotos = upload.fields([
  { name: "image", maxCount: 1 },
  { name: "leaderImage", maxCount: 1 },
]);

router.get("/", TeamController.getAllTeams);
router.get("/:id", TeamController.getTeamById);

router.post(
  "/",
  requireAuth,
  requireAdmin,
  uploadTeamPhotos,
  TeamController.createTeam,
);

router.put(
  "/:id",
  requireAuth,
  requireAdmin,
  uploadTeamPhotos,
  TeamController.updateTeam,
);

router.delete("/:id", requireAuth, requireAdmin, TeamController.deleteTeam);

export default router;
