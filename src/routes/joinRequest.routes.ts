import { Router } from "express";
import { JoinRequestController } from "../controllers/joinRequest.controller.js";
import { requireAuth, requirePermission } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  createJoinRequestSchema,
  updateJoinRequestStatusSchema,
} from "../validators/joinRequest.validator.js";

const router = Router();

// User routes
router.post(
  "/",
  requireAuth,
  validate(createJoinRequestSchema),
  JoinRequestController.create,
);

router.get("/my", requireAuth, JoinRequestController.getMyRequests);

// Admin routes
router.get("/", requireAuth, requirePermission("members.view"), JoinRequestController.getAll);

router.patch(
  "/:requestId/status",
  requireAuth,
  requirePermission("members.edit"),
  validate(updateJoinRequestStatusSchema),
  JoinRequestController.updateStatus,
);

export default router;
