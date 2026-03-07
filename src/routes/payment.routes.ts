import { Router } from "express";
import { PaymentController } from "../controllers/payment.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/chapa/init", requireAuth, PaymentController.initialize);

router.get("/chapa/verify/:tx_ref", requireAuth, PaymentController.verify);

router.post("/chapa/webhook", PaymentController.webhook);

router.get("/my-givings", requireAuth, PaymentController.getMyGivings);

export default router;
