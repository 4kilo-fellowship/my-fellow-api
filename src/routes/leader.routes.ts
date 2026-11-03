import { Router } from "express";
import LeaderController from "../controllers/leader.controller.js";
import { uploadSingle } from "../middleware/upload.middleware.js";
import { requireAuth, requirePermission } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", LeaderController.getAllLeaders);
router.get("/:id", LeaderController.getLeaderById);

router.post(
  "/",
  requireAuth,
  requirePermission("members.edit"),
  uploadSingle,
  LeaderController.createLeader,
);

router.put(
  "/:id",
  requireAuth,
  requirePermission("members.edit"),
  uploadSingle,
  LeaderController.updateLeader,
);

router.delete("/:id", requireAuth, requirePermission("members.edit"), LeaderController.deleteLeader);

export default router;
