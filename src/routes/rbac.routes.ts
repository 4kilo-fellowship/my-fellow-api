import { Router } from "express";
import { RbacController } from "../controllers/rbac.controller.js";
import {
  requireAuth,
  requireMinimumRole,
  requirePermission,
  requireTeamScope,
} from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth);
router.patch(
  "/users/:userId/role",
  requireMinimumRole("leader"),
  RbacController.assignRole,
);
router.post(
  "/users/:userId/grants",
  requirePermission("settings.manage"),
  RbacController.grantPermission,
);
router.delete(
  "/users/:userId/grants/:permission",
  requirePermission("settings.manage"),
  RbacController.revokePermission,
);
router.patch(
  "/teams/:teamId/users/:userId/role",
  requirePermission("team.coordinators.assign"),
  requireTeamScope("teamId"),
  RbacController.assignTeamRole,
);

export default router;
