import { Router } from "express";
import { AuthController } from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { uploadSingle } from "../middleware/upload.middleware.js";
import { handleMulterError } from "../middleware/multerError.middleware.js";

const router = Router();

router.post(
  "/signup",
  uploadSingle,
  handleMulterError,
  AuthController.register,
);
router.post("/signin", AuthController.login);
router.post("/lookup-by-phone", AuthController.lookupByPhone);
router.get("/me", requireAuth, AuthController.getMe);
router.patch(
  "/profile",
  requireAuth,
  uploadSingle,
  handleMulterError,
  AuthController.updateProfile,
);
router.post("/phone/send-otp", AuthController.sendPhoneAuthOtp);
router.post("/phone/verify-otp", AuthController.verifyPhoneAuthOtp);
router.post("/update-phone", requireAuth, AuthController.updatePhone);
router.post("/change-password", requireAuth, AuthController.changePassword);
router.post("/request-otp", AuthController.requestOtp);
router.post("/verify-otp", AuthController.verifyOtp);
router.post("/reset-password", AuthController.resetPassword);

export default router;

