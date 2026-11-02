import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../../middleware/auth.middleware.js";
import { prisma } from "../../utils/prisma.js";
import { serializeUserSummary, serializeMediaAsset } from "../../platform/serializer.js";
import { UserModel } from "../../models/user.model.js";
import { getUserStreak } from "../streaks/streak.service.js";

const router = Router();

// GET /api/v1/meta (public)
router.get("/meta", (req, res) => {
  return res.json({
    minAppVersion: "1.0.0",
    currentVersion: "1.0.0",
    serverTime: new Date().toISOString(),
    features: {
      streaks: true,
      mediaUploads: true,
      pushNotifications: true,
      videoLibrary: true,
      storyHighlights: true,
    },
  });
});

// GET /api/v1/me (auth required)
router.get("/me", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user!.sub;

    let profile = await prisma.profile.findUnique({
      where: { userId },
      include: {
        links: { orderBy: { position: "asc" } },
        streak: true,
        ministryMemberships: {
          include: { ministry: true },
        },
      },
    });

    // Auto-upsert profile from Mongo User record if missing
    if (!profile) {
      const mongoUser = await UserModel.findById(userId);
      const username = mongoUser?.phoneNumber
        ? `user_${mongoUser.phoneNumber.replace(/[^0-9]/g, "").slice(-6)}`
        : `user_${userId.slice(-6)}`;
      const displayName = mongoUser?.fullName || "Fellowship Member";

      profile = await prisma.profile.create({
        data: {
          userId,
          username,
          displayName,
          department: mongoUser?.department || "Engineering",
          studyYear: mongoUser?.yearOfStudy ? parseInt(mongoUser.yearOfStudy, 10) || 3 : 3,
          fellowshipRole: mongoUser?.role === "admin" ? "Fellowship Admin" : "Fellowship Member",
        },
        include: {
          links: true,
          streak: true,
          ministryMemberships: {
            include: { ministry: true },
          },
        },
      });
    }

    // Unread notifications count
    const unreadNotificationsCount = await prisma.notification.count({
      where: {
        recipientId: userId,
        readAt: null,
      },
    });

    // Load avatar media asset if set
    let avatarAsset = null;
    if (profile.avatarAssetId) {
      avatarAsset = await prisma.mediaAsset.findUnique({
        where: { id: profile.avatarAssetId },
      });
    }

    let coverAsset = null;
    if (profile.coverAssetId) {
      coverAsset = await prisma.mediaAsset.findUnique({
        where: { id: profile.coverAssetId },
      });
    }

    const summary = serializeUserSummary(profile, avatarAsset);

    // Get live evaluated streak with break detection
    const evaluatedStreak = await getUserStreak(userId);

    return res.json({
      user: summary,
      profile: {
        ...summary,
        bio: profile.bio,
        location: profile.location,
        department: profile.department,
        studyYear: profile.studyYear,
        visibility: profile.visibility,
        showPresence: profile.showPresence,
        cover: serializeMediaAsset(coverAsset),
        links: profile.links.map((l) => ({ kind: l.kind, handle: l.handle, url: l.url })),
      },
      streak: {
        current: evaluatedStreak.currentStreak,
        longest: evaluatedStreak.bestStreak,
        lastLocalDate: evaluatedStreak.lastActiveDate,
        checkedInToday: evaluatedStreak.checkedInToday,
      },
      unreadNotificationsCount,
    });
  } catch (err) {
    console.error("[Meta /me Error]:", err);
    return res.status(500).json({ success: false, message: "Failed to fetch user state" });
  }
});

export default router;
