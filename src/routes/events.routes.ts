import { Router } from "express";
import EventsController from "../controllers/events.controller.js";
import { uploadSingle, uploadPosterImages } from "../middleware/upload.middleware.js";
import { requireAuth, requirePermission } from "../middleware/auth.middleware.js";

const router = Router();

router.post(
  "/",
  requireAuth,
  requirePermission("events.manage"),
  uploadSingle,
  EventsController.createEvent,
);
router.get("/", EventsController.getAllEvents);
router.get("/:id", EventsController.getEventById);
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
