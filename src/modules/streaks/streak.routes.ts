import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../../middleware/auth.middleware.js";
import { getUserStreak, recordStreakCheckIn } from "./streak.service.js";

const router = Router();

// GET /api/v1/streaks/me and alias /api/v1/streak
router.get(["/streaks/me", "/streak"], requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = req.user!.sub;
    const streak = await getUserStreak(userId);
    return res.json(streak);
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/streak/check-in and alias /api/v1/streaks/checkin
router.post(["/streak/check-in", "/streaks/checkin"], requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = req.user!.sub;
    const streak = await recordStreakCheckIn(userId, "checkin");
    return res.json(streak);
  } catch (err) {
    next(err);
  }
});

export default router;
