import { Router } from "express";
import { PaymentController } from "../controllers/payment.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

// Payment Initialization
router.post("/chapa/init", requireAuth, PaymentController.initialize);

// Payment Verification
router.get("/chapa/verify/:tx_ref", requireAuth, PaymentController.verify);

// Webhook handling
router.post("/chapa/webhook", PaymentController.webhook);

export default router;
