import { Router } from "express";
import EventsController from "../controllers/events.controller.js";
import { uploadSingle, uploadPosterImages } from "../middleware/upload.middleware.js";
import { requireAuth, requirePermission } from "../middleware/auth.middleware.js";
import { optionalAuth } from "../platform/auth.js";

const router = Router();

router.post(
  "/",
  requireAuth,
  requirePermission("events.manage"),
  uploadSingle,
  EventsController.createEvent,
);
router.get("/", optionalAuth, EventsController.getAllEvents);
router.get("/:id", optionalAuth, EventsController.getEventById);
router.patch(
  "/:id/publish",
  requireAuth,
  requirePermission("events.manage"),
  EventsController.togglePublish,
);
router.put(
  "/:id",
  requireAuth,
  requirePermission("events.manage"),
  uploadSingle,
  EventsController.updateEvent,
);
router.delete("/:id", requireAuth, requirePermission("events.manage"), EventsController.deleteEvent);
router.post(
  "/generate-poster",
  requireAuth,
  requirePermission("events.manage"),
  uploadPosterImages,
  EventsController.generatePoster,
);
router.post("/register", requireAuth, EventsController.registerForEvent);
router.post("/unregister", requireAuth, EventsController.unregisterFromEvent);
router.get(
  "/registrations",
  requireAuth,
  requirePermission("reports.view"),
  EventsController.getAllRegistrations,
);
router.get(
  "/registrations/:eventId",
  requireAuth,
  requirePermission("reports.view"),
  EventsController.getRegistrationsByEvent,
);
router.get(
  "/registration-status/:eventId",
  requireAuth,
  EventsController.checkRegistrationStatus,
);

export default router;
