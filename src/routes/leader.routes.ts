import { Router } from "express";
import LeaderController from "../controllers/leader.controller.js";
import { uploadSingle } from "../middleware/upload.middleware.js";
import { requireAuth, requireAdmin } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", LeaderController.getAllLeaders);
router.get("/:id", LeaderController.getLeaderById);

router.post(
  "/",
  requireAuth,
  requireAdmin,
  uploadSingle,
  LeaderController.createLeader,
);

router.put(
  "/:id",
  requireAuth,
  requireAdmin,
  uploadSingle,
  LeaderController.updateLeader,
);

router.delete("/:id", requireAuth, requireAdmin, LeaderController.deleteLeader);

export default router;
