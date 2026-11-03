import { Router } from "express";
import { PaymentController } from "../controllers/payment.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

// Jami Payment Routes
router.post("/jami/init", requireAuth, PaymentController.initializeJami);
router.get("/jami/verify/:sessionId", requireAuth, PaymentController.verifyJami);
router.post("/jami/webhook", PaymentController.jamiWebhook);

// Primary aliases
router.post("/init", requireAuth, PaymentController.initializeJami);
router.get("/verify/:sessionId", requireAuth, PaymentController.verifyJami);

// Hosted completion landing page (returns payer back to mobile app via deep link)
router.get("/success", (_req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Successful - 4 Kilo Fellowship</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background-color: #09090b; color: #fff; text-align: center; padding: 20px; }
    .card { background: #18181b; border: 1px solid #27272a; border-radius: 24px; padding: 40px 24px; max-width: 400px; width: 100%; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
    .icon { width: 72px; height: 72px; background: rgba(255, 103, 25, 0.15); color: #ff6719; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; font-size: 36px; font-weight: bold; }
    h1 { font-size: 24px; font-weight: 800; margin-bottom: 8px; }
    p { color: #a1a1aa; font-size: 15px; line-height: 1.5; margin-bottom: 28px; }
    .btn { display: inline-block; width: 100%; box-sizing: border-box; background: #ff6719; color: #fff; font-weight: 700; font-size: 16px; padding: 14px 20px; border-radius: 14px; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✓</div>
    <h1>Payment Successful</h1>
    <p>Thank you for your generous gift to the fellowship! Tap below to return to the app.</p>
    <a href="my-fellow://payment-status" class="btn">Return to My Fellow App</a>
  </div>
  <script>
    setTimeout(function() {
      window.location.href = "my-fellow://payment-status";
    }, 1000);
  </script>
</body>
</html>`);
});

// Legacy Chapa Routes (preserved for backward compatibility)
router.post("/chapa/init", requireAuth, PaymentController.initialize);
router.get("/chapa/verify/:tx_ref", requireAuth, PaymentController.verify);
router.post("/chapa/webhook", PaymentController.webhook);

router.get("/my-givings", requireAuth, PaymentController.getMyGivings);

export default router;
