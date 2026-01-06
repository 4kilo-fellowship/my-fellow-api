import express from "express";
import authRoutes from "./routes/auth.routes.js";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import cors from "cors";

const app = express();

app.use(helmet());
app.use(cors());
app.use(express.json());

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use("/api/auth", authLimiter, authRoutes);

app.get("/health", (req, res) => res.json({ ok: true }));

export default app;
