import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../../middleware/auth.middleware.js";
import { optionalAuth } from "../../platform/auth.js";
import { AppError } from "../../platform/errors.js";
import {
  serializeMediaAsset,
  serializeUserSummary,
  getAcademicLabel,
  isUserOnline,
} from "../../platform/serializer.js";
import { MediaRef, ProfileDetail, UserSummary } from "../../platform/types.js";
import { routeParam } from "../../utils/routeParam.js";
import { getUserStreak } from "../streaks/streak.service.js";
import { hydratePosts } from "../posts/post.service.js";
import { UserModel } from "../../models/user.model.js";
import {
  ProfileModel,
  PostModel,
  FollowModel,
  BlockModel,
  MuteModel,
  HighlightModel,
  MediaAssetModel,
} from "../../models/social.models.js";
import mongoose from "mongoose";

const router = Router();

// Fallback resolver for Official Fellowship entity or Mongo-backed users
async function resolveMongoFallbackProfile(cleanParam: string, viewerId?: string): Promise<ProfileDetail | null> {
  const normalized = cleanParam.toLowerCase();
  const isOfficial = ["4kilofellowship", "4kilo", "fellowship", "counseling", "counseling_team"].includes(normalized);

  let user = null;
  if (!isOfficial) {
    if (mongoose.Types.ObjectId.isValid(cleanParam)) {
      user = await UserModel.findById(cleanParam).lean();
    }
    if (!user) {
      user = await UserModel.findOne({
        $or: [
          { telegramUserName: cleanParam },
          { fullName: new RegExp(`^${cleanParam}$`, "i") }
        ]
      }).lean();
    }
  }

  if (!isOfficial && !user) {
    return null;
  }

  const id = isOfficial ? "4kilofellowship" : (user as any)!._id.toString();
  const username = isOfficial ? "4kilofellowship" : ((user as any)!.telegramUserName ? (user as any)!.telegramUserName.replace(/^@/, "") : `user_${id.slice(-6)}`);
  const displayName = isOfficial ? "4 Kilo Christian Students Fellowship" : ((user as any)!.fullName || "Fellowship Member");
  const avatarUrl = isOfficial
    ? "https://res.cloudinary.com/doi9bg69o/image/upload/v1793867306/my-fellow/fellowship-avatar.png"
    : ((user as any)!.profileImage || null);

  const fallbackAvatar: MediaRef | null = avatarUrl ? {
    id: `avatar-${id}`,
    kind: "image",
    width: 400,
    height: 400,
    urls: {
      sm: avatarUrl,
      md: avatarUrl,
      lg: avatarUrl,
      original: avatarUrl
    }
  } : null;

  const fallbackCover: MediaRef = {
    id: "default-cover",
    kind: "image",
    width: 1200,
    height: 400,
    urls: {
      sm: "https://images.unsplash.com/photo-1519491050282-cf00c82424b4?auto=format&fit=crop&w=800&q=80",
      md: "https://images.unsplash.com/photo-1519491050282-cf00c82424b4?auto=format&fit=crop&w=1200&q=80",
      lg: "https://images.unsplash.com/photo-1519491050282-cf00c82424b4?auto=format&fit=crop&w=1600&q=80",
      original: "https://images.unsplash.com/photo-1519491050282-cf00c82424b4"
    }
  };

  const bio = isOfficial
    ? "The official campus fellowship at AAU 4 Kilo Campus. Preaching Christ, making disciples, and walking in fellowship. Daily morning prayer 6:00 AM."
    : ((user as any)?.department ? `${(user as any).department} student walking faithfully in Christ.` : "Fellowship member at AAU 4 Kilo Campus.");

  const studyYear = (user as any)?.yearOfStudy ? parseInt(String((user as any).yearOfStudy), 10) : undefined;
  const academic = {
    department: (user as any)?.department || "Engineering",
    studyYear: isNaN(studyYear as number) ? 2 : studyYear,
    label: getAcademicLabel((user as any)?.department || "Engineering", isNaN(studyYear as number) ? 2 : studyYear)
  };

  let isFollowing = false;
  if (viewerId) {
    const f = await FollowModel.findOne({ followerId: viewerId, followeeId: id, status: "accepted" }).lean();
    isFollowing = Boolean(f);
  }

  const followersCount = await FollowModel.countDocuments({ followeeId: id, status: "accepted" });
  const followingCount = await FollowModel.countDocuments({ followerId: id, status: "accepted" });
  const postsCount = await PostModel.countDocuments({ authorId: id, deletedAt: null });

  return {
    id,
    username,
    displayName,
    avatar: fallbackAvatar,
    cover: fallbackCover,
    bio,
    location: "4 Kilo Campus, AAU",
    joinedAt: (user as any)?.createdAt ? new Date((user as any).createdAt).toISOString() : new Date().toISOString(),
    isVerified: isOfficial || (user as any)?.role === "admin" || (user as any)?.role === "leader",
    fellowshipRole: isOfficial ? "Official Fellowship" : ((user as any)?.team || (user as any)?.role || "Fellowship Member"),
    ministryBadge: isOfficial ? "4 Kilo Campus ECSF" : ((user as any)?.team || "Student Ministry"),
    links: [
      {
        kind: "telegram",
        handle: username,
        url: `https://t.me/${username}`
      }
    ],
    academic,
    badges: [
      { kind: "ministry", label: isOfficial ? "Main Fellowship" : ((user as any)?.team || "General Ministry") },
      { kind: "academic", label: academic.label || "AAU Student" },
      { kind: "role", label: isOfficial ? "Official" : "Member" }
    ],
    streak: { current: 1 },
    counts: {
      following: followingCount,
      connects: followersCount,
      reflections: postsCount
    },
    presence: { online: true },
    viewer: {
      isSelf: viewerId === id,
      following: isFollowing,
      followedBy: false,
      pendingRequest: false,
      blocked: false,
      blockedBy: false,
      muted: false
    },
    followedByPreview: { total: 0, users: [] },
    highlights: []
  };
}

// GET /api/v1/profiles/:username
router.get("/profiles/:username", optionalAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const rawUsername = routeParam(req.params.username);
    const cleanParam = rawUsername.replace(/^@/, "");
    const viewerId = req.user?.sub;

    let profile = await ProfileModel.findOne({
      $or: [
        { userId: cleanParam },
        { username: new RegExp(`^${cleanParam}$`, "i") },
      ],
    }).lean();

    if (!profile) {
      const fallback = await resolveMongoFallbackProfile(cleanParam, viewerId);
      if (fallback) {
        return res.json(fallback);
      }
      throw AppError.notFound("Profile not found", "PROFILE_NOT_FOUND");
    }

    const targetUserId = (profile as any).userId;
    const isSelf = viewerId === targetUserId;

    // Fetch blocks and mutes
    let isFollowing = false;
    let isFollowedBy = false;
    let isPendingRequest = false;
    let isBlocked = false;
    let isBlockedBy = false;
    let isMuted = false;

    if (viewerId && !isSelf) {
      const [blockTo, blockFrom, mute, followTo, followFrom] = await Promise.all([
        BlockModel.findOne({ blockerId: viewerId, blockedId: targetUserId }).lean(),
        BlockModel.findOne({ blockerId: targetUserId, blockedId: viewerId }).lean(),
        MuteModel.findOne({ muterId: viewerId, mutedId: targetUserId }).lean(),
        FollowModel.findOne({ followerId: viewerId, followeeId: targetUserId }).lean(),
        FollowModel.findOne({ followerId: targetUserId, followeeId: viewerId }).lean(),
      ]);

      isBlocked = Boolean(blockTo);
      isBlockedBy = Boolean(blockFrom);
      isMuted = Boolean(mute);
      isFollowing = (followTo as any)?.status === "accepted";
      isPendingRequest = (followTo as any)?.status === "pending";
      isFollowedBy = (followFrom as any)?.status === "accepted";
    }

    if (isBlockedBy) {
      throw AppError.notFound("Profile not found");
    }

    // Resolve avatar and cover
    let avatarAsset = null;
    let coverAsset = null;

    if ((profile as any).avatarAssetId) {
      avatarAsset = await MediaAssetModel.findOne({
        $or: [{ _id: (profile as any).avatarAssetId }, { id: (profile as any).avatarAssetId }],
      }).lean();
    }
    if ((profile as any).coverAssetId) {
      coverAsset = await MediaAssetModel.findOne({
        $or: [{ _id: (profile as any).coverAssetId }, { id: (profile as any).coverAssetId }],
      }).lean();
    }

    // Mutual follows preview
    let followedByPreviewUsers: UserSummary[] = [];
    let totalMutuals = 0;

    if (viewerId && !isSelf) {
      const targetFollowers = await FollowModel.find({ followeeId: targetUserId, status: "accepted" }).select("followerId").lean();
      const targetFollowerIds = targetFollowers.map((f: any) => f.followerId);

      const viewerFollowsTargetFollowers = await FollowModel.find({
        followerId: viewerId,
        followeeId: { $in: targetFollowerIds },
        status: "accepted",
      }).limit(3).lean();

      totalMutuals = await FollowModel.countDocuments({
        followerId: viewerId,
        followeeId: { $in: targetFollowerIds },
        status: "accepted",
      });

      const mutualUserIds = viewerFollowsTargetFollowers.map((vf: any) => vf.followeeId);
      const mutualProfiles = await ProfileModel.find({ userId: { $in: mutualUserIds } }).lean();

      const avatarIds = mutualProfiles.map((p: any) => p.avatarAssetId).filter(Boolean);
      const avatars = await MediaAssetModel.find({
        $or: [{ _id: { $in: avatarIds } }, { id: { $in: avatarIds } }],
      }).lean();
      const avatarMap = new Map(avatars.map((a: any) => [a._id ? a._id.toString() : a.id, a]));

      followedByPreviewUsers = mutualProfiles.map((p: any) =>
        serializeUserSummary(p, p.avatarAssetId ? avatarMap.get(p.avatarAssetId) : null)
      );
    }

    // Highlights
    const highlights = await HighlightModel.find({ ownerId: targetUserId })
      .sort({ position: 1 })
      .lean();

    const highlightCoverIds = highlights.map((h: any) => h.coverAssetId).filter(Boolean);
    const highlightCovers = await MediaAssetModel.find({
      $or: [{ _id: { $in: highlightCoverIds } }, { id: { $in: highlightCoverIds } }],
    }).lean();
    const highlightCoverMap = new Map(highlightCovers.map((c: any) => [c._id ? c._id.toString() : c.id, c]));

    const serializedHighlights = highlights.map((h: any) => ({
      id: h._id.toString(),
      title: h.title,
      emoji: h.emoji || undefined,
      cover: h.coverAssetId ? serializeMediaAsset(highlightCoverMap.get(h.coverAssetId)) : null,
    }));

    // Streaks
    const streakResult = await getUserStreak(targetUserId);

    const detail: ProfileDetail = {
      ...serializeUserSummary(profile, avatarAsset),
      cover: serializeMediaAsset(coverAsset),
      bio: (profile as any).bio || null,
      location: (profile as any).location || null,
      joinedAt: (profile as any).createdAt ? new Date((profile as any).createdAt).toISOString() : new Date().toISOString(),
      links: (profile as any).links || [],
      academic: {
        department: (profile as any).department || undefined,
        studyYear: (profile as any).studyYear || undefined,
        label: getAcademicLabel((profile as any).department, (profile as any).studyYear),
      },
      badges: [
        { kind: "ministry", label: (profile as any).fellowshipRole || "Fellowship Member" },
        { kind: "academic", label: getAcademicLabel((profile as any).department, (profile as any).studyYear) || "AAU Student" },
        { kind: "streak", label: `${streakResult.currentStreak}d Streak` },
      ],
      streak: { current: streakResult.currentStreak },
      counts: {
        following: (profile as any).followingCount || 0,
        connects: (profile as any).followersCount || 0,
        reflections: (profile as any).postsCount || 0,
      },
      presence: {
        online: isUserOnline((profile as any).lastSeenAt, (profile as any).showPresence),
        lastSeenAt: (profile as any).lastSeenAt ? new Date((profile as any).lastSeenAt).toISOString() : null,
      },
      viewer: {
        isSelf,
        following: isFollowing,
        followedBy: isFollowedBy,
        pendingRequest: isPendingRequest,
        blocked: isBlocked,
        blockedBy: isBlockedBy,
        muted: isMuted,
      },
      followedByPreview: {
        total: totalMutuals,
        users: followedByPreviewUsers,
      },
      highlights: serializedHighlights,
    };

    return res.json(detail);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/profiles/:username/posts
router.get("/profiles/:username/posts", optionalAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const rawUsername = routeParam(req.params.username);
    const cleanParam = rawUsername.replace(/^@/, "");
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const viewerId = req.user?.sub;

    let profile = await ProfileModel.findOne({
      $or: [
        { userId: cleanParam },
        { username: new RegExp(`^${cleanParam}$`, "i") },
      ],
    }).lean();

    let targetUserId = (profile as any)?.userId;
    if (!targetUserId) {
      if (cleanParam === "4kilofellowship") {
        targetUserId = "4kilofellowship";
      } else {
        const u = await UserModel.findById(cleanParam).lean();
        if (u) targetUserId = (u as any)._id.toString();
      }
    }

    if (!targetUserId) {
      return res.json({ items: [], nextCursor: null, hasMore: false });
    }

    const posts = await PostModel.find({
      authorId: targetUserId,
      kind: { $in: ["post", "repost", "quote"] },
      deletedAt: null,
    })
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const hydrated = await hydratePosts(posts, viewerId);

    return res.json({
      items: hydrated,
      nextCursor: null,
      hasMore: false,
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/v1/me/profile
router.patch("/me/profile", requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = req.user!.sub;
    const { displayName, bio, location, department, studyYear, fellowshipRole, links } = req.body;

    const profile = await ProfileModel.findOneAndUpdate(
      { userId },
      {
        $set: {
          ...(displayName !== undefined && { displayName: String(displayName).trim() }),
          ...(bio !== undefined && { bio: String(bio).trim() }),
          ...(location !== undefined && { location: String(location).trim() }),
          ...(department !== undefined && { department: String(department).trim() }),
          ...(studyYear !== undefined && { studyYear: Number(studyYear) || null }),
          ...(fellowshipRole !== undefined && { fellowshipRole: String(fellowshipRole).trim() }),
          ...(Array.isArray(links) && { links }),
        },
      },
      { new: true, upsert: true }
    ).lean();

    return res.json({ success: true, profile });
  } catch (err) {
    next(err);
  }
});

export default router;
