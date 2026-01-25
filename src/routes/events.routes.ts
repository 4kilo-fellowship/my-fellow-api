import { Router } from "express";
import EventsController from "../controllers/events.controller.js";
import { uploadSingle } from "../middleware/upload.middleware.js";

const router = Router();

router.post("/", uploadSingle, EventsController.createEvent);
router.get("/", EventsController.getAllEvents);
router.get("/:id", EventsController.getEventById);
router.put("/:id", uploadSingle, EventsController.updateEvent);
router.delete("/:id", EventsController.deleteEvent);
router.post("/register", EventsController.registerForEvent);
router.get("/registrations", EventsController.getAllRegistrations);
router.get(
  "/registrations/:eventTitle",
  EventsController.getRegistrationsByEvent,
);

export default router;
