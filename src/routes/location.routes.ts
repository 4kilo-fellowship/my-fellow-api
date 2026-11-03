import { Router } from "express";
import LocationController from "../controllers/location.controller.js";
import { uploadSingle } from "../middleware/upload.middleware.js";
import { requireAuth, requirePermission } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", LocationController.getAllLocations);
router.get("/:id", LocationController.getLocationById);

router.post(
  "/",
  requireAuth,
  requirePermission("teams.manage"),
  uploadSingle,
  LocationController.createLocation,
);

router.put(
  "/:id",
  requireAuth,
  requirePermission("teams.manage"),
  uploadSingle,
  LocationController.updateLocation,
);

router.delete(
  "/:id",
  requireAuth,
  requirePermission("teams.manage"),
  LocationController.deleteLocation,
);

export default router;
