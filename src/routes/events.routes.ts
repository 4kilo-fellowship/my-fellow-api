import { Router } from "express";
import EventsController from "../controllers/events.controller.js";
import { uploadSingle } from "../middleware/upload.middleware.js";

const router = Router();

// Create event (multipart/form-data: image file or fields)
router.post("/", uploadSingle, EventsController.createEvent);

// Get all events (optional query ?sort=asc|desc)
router.get("/", EventsController.getAllEvents);

// Get specific event
router.get("/:id", EventsController.getEventById);

// Update event (optional) - accept image replacement via multipart
router.put("/:id", uploadSingle, EventsController.updateEvent);

// Delete event (optional)
router.delete("/:id", EventsController.deleteEvent);

// Register for event
router.post("/register", EventsController.registerForEvent);

// Get all registrations
router.get("/registrations", EventsController.getAllRegistrations);

// Get registrations by event title
router.get("/registrations/:eventTitle", EventsController.getRegistrationsByEvent);

export default router;
