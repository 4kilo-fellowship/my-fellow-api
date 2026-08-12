import { Router } from "express";
import rateLimit from "express-rate-limit";
import { AuthController } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { uploadSingle } from "../middleware/upload.middleware.js";
import { handleMulterError } from "../middleware/multerError.middleware.js";

const router = Router();

const otpLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post(
  "/signup",
  uploadSingle,
  handleMulterError,
  AuthController.register,
);
router.post("/signin", AuthController.login);
router.post("/lookup-by-phone", AuthController.lookupByPhone);
router.post("/otp/send", otpLimiter, AuthController.sendOtp);
router.post("/otp/verify", otpLimiter, AuthController.verifyOtp);
router.get("/me", requireAuth, AuthController.getMe);
router.patch(
  "/profile",
  requireAuth,
  uploadSingle,
  handleMulterError,
  AuthController.updateProfile,
);
router.post("/update-phone", requireAuth, AuthController.updatePhone);

export default router;
