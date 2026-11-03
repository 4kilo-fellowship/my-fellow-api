import { Router } from "express";
import { AdminController } from "../controllers/admin.controller.js";
import { requireAuth, requirePermission } from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth);

router.get("/users", requirePermission("members.view"), AdminController.getAllUsers);
router.get("/events", requirePermission("events.view"), AdminController.getAllEvents);
router.get("/registrations", requirePermission("reports.view"), AdminController.getAllRegistrations);
router.get("/registrations/report", requirePermission("reports.export"), AdminController.getRegistrationsReport);
router.get("/transactions", requirePermission("finance.view"), AdminController.getAllTransactions);
router.get("/stats", requirePermission("reports.view"), AdminController.getStats);

export default router;
