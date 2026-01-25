import express from "express";
import authRoutes from "./routes/auth.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import eventsRoutes from "./routes/events.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import cors from "cors";

// create express server
const app = express();

// add a security layer for the app
app.use(helmet());
app.use(cors());

// parse json when no multipart/form-data
app.use((req, res, next) => {
  const contentType = req.headers["content-type"] || "";
  if (contentType.includes("multipart/form-data")) {
    return next();
  }
  express.json({
    verify: (req: any, res, buf) => {
      req.rawBody = buf;
    },
  })(req, res, next);
});

// limit the number of auth requests
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

// limit the number of upload requests
const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

// Events rate limiter (separate limits to avoid abuse)
const eventsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/upload", uploadLimiter, uploadRoutes);
app.use("/api/events", eventsLimiter, eventsRoutes);
app.use("/api/payments", paymentRoutes);

app.get("/health", (req, res) => res.json({ ok: true }));

export default app;
