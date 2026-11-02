import { prisma } from "../../utils/prisma.js";

/**
 * Returns YYYY-MM-DD for a given timezone and day offset
 */
export function getLocalDateString(timeZone: string = "Africa/Addis_Ababa", offsetDays: number = 0): string {
  const d = new Date(Date.now() + offsetDays * 86400000);
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(d);
}

export interface UserStreakResult {
  currentStreak: number;
  bestStreak: number;
  lastActiveDate: string | null;
  activeDates: string[];
  totalDevotionsCompleted: number;
  checkedInToday: boolean;
}

/**
 * Evaluates a user's streak status with calendar date break detection
 */
export async function getUserStreak(userId: string): Promise<UserStreakResult> {
  const profile = await prisma.profile.findUnique({
    where: { userId },
    include: { streak: true },
  });

  const tz = profile?.timezone || "Africa/Addis_Ababa";
  const today = getLocalDateString(tz, 0);
  const yesterday = getLocalDateString(tz, -1);

  const userStreak = profile?.streak;
  const lastDate = userStreak?.lastLocalDate;

  // Baseline encouragement: initialize with at least 1 day for newly registered members
  let current = userStreak ? userStreak.current : 1;
  const longest = userStreak ? userStreak.longest : 1;

  // Lapsed check: If user had an active check-in date and it's older than yesterday, reset to 0
  if (lastDate && lastDate !== today && lastDate !== yesterday) {
    current = 0;
  } else if (!lastDate) {
    // Member has not checked in yet: give them day 1 welcome baseline
    current = Math.max(1, current);
  }

  const checkedInToday = lastDate === today;

  // Fetch recent active days (up to last 60 days)
  const recentDays = await prisma.streakDay.findMany({
    where: { userId },
    orderBy: { localDate: "desc" },
    take: 60,
  });

  const activeDates = recentDays.map((d) => d.localDate);
  const totalDevotionsCompleted = await prisma.streakDay.count({
    where: { userId },
  });

  return {
    currentStreak: current,
    bestStreak: longest,
    lastActiveDate: lastDate || null,
    activeDates,
    totalDevotionsCompleted,
    checkedInToday,
  };
}

/**
 * Server-authoritative, idempotent daily check-in
 * Triggered by: Daily check-in button, reading a devotion, or posting a reflection
 */
export async function recordStreakCheckIn(
  userId: string,
  source: "checkin" | "devotion" | "post" = "checkin"
): Promise<UserStreakResult> {
  const profile = await prisma.profile.findUnique({
    where: { userId },
    include: { streak: true },
  });

  const tz = profile?.timezone || "Africa/Addis_Ababa";
  const today = getLocalDateString(tz, 0);
  const yesterday = getLocalDateString(tz, -1);

  return await prisma.$transaction(async (tx) => {
    // 1. Check if user already checked in for local calendar day
    const existingDay = await tx.streakDay.findUnique({
      where: { userId_localDate: { userId, localDate: today } },
    });

    let s = await tx.userStreak.findUnique({ where: { userId } });
    let current = s?.current || 0;
    let longest = s?.longest || 0;
    let isNewDayForStreak = false;

    if (!existingDay) {
      await tx.streakDay.create({
        data: {
          userId,
          localDate: today,
        },
      });

      if (s) {
        if (s.lastLocalDate === yesterday) {
          current = s.current + 1;
        } else {
          current = 1;
        }
        longest = Math.max(s.longest, current);

        s = await tx.userStreak.update({
          where: { userId },
          data: {
            current,
            longest,
            lastLocalDate: today,
          },
        });
      } else {
        current = 1;
        longest = 1;
        s = await tx.userStreak.create({
          data: {
            userId,
            current: 1,
            longest: 1,
            lastLocalDate: today,
          },
        });
      }

      isNewDayForStreak = true;

      // Milestone notification via Outbox (7, 30, 100 days)
      if ([7, 30, 100].includes(current)) {
        await tx.outboxEvent.create({
          data: {
            type: "streak_milestone",
            aggregateId: userId,
            payload: {
              userId,
              milestoneDays: current,
              source,
            },
          },
        });

        await tx.notification.create({
          data: {
            recipientId: userId,
            type: "streak_milestone",
            groupKey: `streak:${userId}:${current}`,
            actorIds: [],
            actorCount: 0,
            entityType: "streak",
            entityId: String(current),
            data: {
              title: "🔥 Streak Milestone Reached!",
              message: `Praise God! You have reached a ${current}-day fellowship streak.`,
              days: current,
            },
          },
        });
      }
    } else {
      // Already checked in today
      if (s) {
        current = s.current;
        longest = s.longest;
      }
    }

    const recentDays = await tx.streakDay.findMany({
      where: { userId },
      orderBy: { localDate: "desc" },
      take: 60,
    });
    const activeDates = recentDays.map((d) => d.localDate);
    const totalCount = await tx.streakDay.count({ where: { userId } });

    return {
      currentStreak: current,
      bestStreak: longest,
      lastActiveDate: today,
      activeDates,
      totalDevotionsCompleted: totalCount,
      checkedInToday: true,
    };
  });
}
