import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../../middleware/auth.middleware.js";
import { prisma } from "../../utils/prisma.js";

const router = Router();

// Helper to get local date string YYYY-MM-DD
function getLocalDateString(timeZone: string = "Africa/Addis_Ababa", offsetDays: number = 0): string {
  const d = new Date(Date.now() + offsetDays * 86400000);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(d);
}

// GET /api/v1/streaks/me
router.get("/streaks/me", requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = req.user!.sub;

    const profile = await prisma.profile.findUnique({
      where: { userId },
      include: { streak: true },
    });

    const tz = profile?.timezone || "Africa/Addis_Ababa";
    const today = getLocalDateString(tz, 0);
    const yesterday = getLocalDateString(tz, -1);

    const userStreak = profile?.streak;
    const lastDate = userStreak?.lastLocalDate;

    let current = userStreak?.current || 0;
    const longest = userStreak?.longest || 0;

    // Check if broken
    if (lastDate && lastDate !== today && lastDate !== yesterday) {
      current = 0;
    }

    const checkedInToday = lastDate === today;

    return res.json({
      current,
      longest,
      lastLocalDate: lastDate || null,
      checkedInToday,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/streak/check-in
router.post("/streak/check-in", requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = req.user!.sub;

    const profile = await prisma.profile.findUnique({
      where: { userId },
      include: { streak: true },
    });

    const tz = profile?.timezone || "Africa/Addis_Ababa";
    const today = getLocalDateString(tz, 0);
    const yesterday = getLocalDateString(tz, -1);

    const result = await prisma.$transaction(async (tx) => {
      const existingDay = await tx.streakDay.findUnique({
        where: { userId_localDate: { userId, localDate: today } },
      });

      if (existingDay) {
        const s = await tx.userStreak.findUnique({ where: { userId } });
        return {
          current: s?.current || 1,
          longest: s?.longest || 1,
          checkedInToday: true,
        };
      }

      await tx.streakDay.create({
        data: {
          userId,
          localDate: today,
        },
      });

      const s = await tx.userStreak.findUnique({ where: { userId } });
      let current = 1;
      let longest = 1;

      if (s) {
        if (s.lastLocalDate === yesterday) {
          current = s.current + 1;
        } else {
          current = 1;
        }
        longest = Math.max(s.longest, current);

        await tx.userStreak.update({
          where: { userId },
          data: {
            current,
            longest,
            lastLocalDate: today,
          },
        });
      } else {
        await tx.userStreak.create({
          data: {
            userId,
            current: 1,
            longest: 1,
            lastLocalDate: today,
          },
        });
      }

      return {
        current,
        longest,
        checkedInToday: true,
      };
    });

    return res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
