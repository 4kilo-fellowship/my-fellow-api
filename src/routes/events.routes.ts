import { Router } from "express";
import EventsController from "../controllers/events.controller.js";
import { uploadSingle } from "../middleware/upload.middleware.js";
import { requireAuth, requireAdmin } from "../middleware/auth.middleware.js";

const router = Router();

router.post(
  "/",
  requireAuth,
  requireAdmin,
  uploadSingle,
  EventsController.createEvent,
);
router.get("/", EventsController.getAllEvents);
router.get("/:id", EventsController.getEventById);
router.put(
  "/:id",
  requireAuth,
  requireAdmin,
  uploadSingle,
  EventsController.updateEvent,
);
router.delete("/:id", requireAuth, requireAdmin, EventsController.deleteEvent);
router.post("/register", EventsController.registerForEvent);
router.get(
  "/registrations",
  requireAuth,
  requireAdmin,
  EventsController.getAllRegistrations,
);
router.get(
  "/registrations/:eventTitle",
  requireAuth,
  requireAdmin,
  EventsController.getRegistrationsByEvent,
);

export default router;
