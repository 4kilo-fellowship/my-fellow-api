import { Router } from "express";
import TeamController from "../controllers/team.controller.js";
import { upload } from "../middleware/upload.middleware.js";
import {
  requireAuth,
  requireMinimumRole,
  requirePermission,
  requireTeamScope,
} from "../middleware/auth.middleware.js";

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
  requireMinimumRole("leader"),
  uploadTeamPhotos,
  TeamController.createTeam,
);

router.put(
  "/:id",
  requireAuth,
  requirePermission("teams.manage"),
  requireTeamScope("id"),
  uploadTeamPhotos,
  TeamController.updateTeam,
);

router.delete(
  "/:id",
  requireAuth,
  requirePermission("teams.manage"),
  requireTeamScope("id"),
  TeamController.deleteTeam,
);

export default router;
