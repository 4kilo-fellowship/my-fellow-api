import express, { Request, Response, NextFunction } from "express";
import authRoutes from "./routes/auth.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import eventsRoutes from "./routes/events.routes.js";
import paymentRoutes from "./routes/payment.routes.js";
import adminRoutes from "./routes/admin.routes.js";
import teamRoutes from "./routes/team.routes.js";
import joinRequestRoutes from "./routes/joinRequest.routes.js";
import programRoutes from "./routes/program.routes.js";
import locationRoutes from "./routes/location.routes.js";
import leaderRoutes from "./routes/leader.routes.js";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import cors from "cors";

const app = express();

app.use(helmet());
app.use(cors());

app.use((req: Request, res: Response, next: NextFunction) => {
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

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

const eventsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

const teamLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

const programLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

const locationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

const leaderLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/upload", uploadLimiter, uploadRoutes);
app.use("/api/events", eventsLimiter, eventsRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/teams", teamLimiter, teamRoutes);
app.use("/api/join-requests", joinRequestRoutes);
app.use("/api/programs", programLimiter, programRoutes);
app.use("/api/locations", locationLimiter, locationRoutes);
app.use("/api/leaders", leaderLimiter, leaderRoutes);

app.get("/health", (req, res) => res.json({ ok: true }));

export default app;
