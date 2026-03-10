import { Router } from "express";
import { AdminController } from "../controllers/admin.controller.js";
import { requireAuth, requireAdmin } from "../middleware/auth.middleware.js";

const router = Router();

router.use(requireAuth);
router.use(requireAdmin);

router.get("/users", AdminController.getAllUsers);
router.get("/events", AdminController.getAllEvents);
router.get("/registrations", AdminController.getAllRegistrations);
router.get("/registrations/report", AdminController.getRegistrationsReport);
router.get("/transactions", AdminController.getAllTransactions);
router.get("/stats", AdminController.getStats);

export default router;
