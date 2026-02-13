import { Router } from "express";
import LocationController from "../controllers/location.controller.js";
import { uploadSingle } from "../middleware/upload.middleware.js";
import { requireAuth, requireAdmin } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", LocationController.getAllLocations);
router.get("/:id", LocationController.getLocationById);

router.post(
  "/",
  requireAuth,
  requireAdmin,
  uploadSingle,
  LocationController.createLocation,
);

router.put(
  "/:id",
  requireAuth,
  requireAdmin,
  uploadSingle,
  LocationController.updateLocation,
);

router.delete(
  "/:id",
  requireAuth,
  requireAdmin,
  LocationController.deleteLocation,
);

export default router;
