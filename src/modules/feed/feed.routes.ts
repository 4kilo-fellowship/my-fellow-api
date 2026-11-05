import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../../middleware/auth.middleware.js";
import { optionalAuth } from "../../platform/auth.js";
import { hydratePosts } from "../posts/post.service.js";
import { buildPaginatedResponse, decodeCursor } from "../../platform/pagination.js";
import {
  PostModel,
  FollowModel,
  BlockModel,
  MuteModel,
} from "../../models/social.models.js";

const router = Router();

// GET /api/v1/feed/following
router.get("/feed/following", requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const viewerId = req.user!.sub;
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const cursor = decodeCursor(req.query.cursor as string);

    // Get followed IDs
    const followRows = await FollowModel.find({ followerId: viewerId, status: "accepted" })
      .select("followeeId")
      .lean();
    const followedIds = [viewerId, ...followRows.map((f: any) => f.followeeId)];

    // Get blocked and muted IDs
    const [blocks, blockedBy, mutes] = await Promise.all([
      BlockModel.find({ blockerId: viewerId }).select("blockedId").lean(),
      BlockModel.find({ blockedId: viewerId }).select("blockerId").lean(),
      MuteModel.find({ muterId: viewerId }).select("mutedId").lean(),
    ]);

    const excludedAuthorIds = new Set([
      ...blocks.map((b: any) => b.blockedId),
      ...blockedBy.map((b: any) => b.blockerId),
      ...mutes.map((m: any) => m.mutedId),
    ]);

    const candidateAuthorIds = followedIds.filter((id) => !excludedAuthorIds.has(id));

    const query: any = {
      authorId: { $in: candidateAuthorIds },
      kind: { $in: ["post", "repost", "quote"] },
      deletedAt: null,
    };

    if (cursor) {
      query.createdAt = { $lt: new Date(cursor.t) };
    }

    const posts = await PostModel.find(query)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .lean();

    const paginated = buildPaginatedResponse(posts, limit, (item: any) => ({
      t: new Date(item.createdAt).toISOString(),
      id: item._id.toString(),
    }));

    const hydrated = await hydratePosts(paginated.items, viewerId);

    return res.json({
      items: hydrated,
      nextCursor: paginated.nextCursor,
      hasMore: paginated.hasMore,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/feed/foryou
router.get("/feed/foryou", optionalAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const viewerId = req.user?.sub;
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const cursor = decodeCursor(req.query.cursor as string);

    let excludedAuthorIds = new Set<string>();
    if (viewerId) {
      const [blocks, blockedBy, mutes] = await Promise.all([
        BlockModel.find({ blockerId: viewerId }).select("blockedId").lean(),
        BlockModel.find({ blockedId: viewerId }).select("blockerId").lean(),
        MuteModel.find({ muterId: viewerId }).select("mutedId").lean(),
      ]);
      blocks.forEach((b: any) => excludedAuthorIds.add(b.blockedId));
      blockedBy.forEach((b: any) => excludedAuthorIds.add(b.blockerId));
      mutes.forEach((m: any) => excludedAuthorIds.add(m.mutedId));
    }

    const query: any = {
      kind: { $in: ["post", "repost", "quote"] },
      deletedAt: null,
      visibility: "public",
    };

    if (excludedAuthorIds.size > 0) {
      query.authorId = { $nin: Array.from(excludedAuthorIds) };
    }

    if (cursor) {
      query.createdAt = { $lt: new Date(cursor.t) };
    }

    const posts = await PostModel.find(query)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .lean();

    const paginated = buildPaginatedResponse(posts, limit, (item: any) => ({
      t: new Date(item.createdAt).toISOString(),
      id: item._id.toString(),
    }));

    const hydrated = await hydratePosts(paginated.items, viewerId);

    return res.json({
      items: hydrated,
      nextCursor: paginated.nextCursor,
      hasMore: paginated.hasMore,
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/feed/head
router.get("/feed/head", optionalAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const viewerId = req.user?.sub;
    const since = req.query.since ? decodeCursor(req.query.since as string) : null;

    if (!since) {
      return res.json({ newCount: 0 });
    }

    const query: any = {
      deletedAt: null,
      kind: { $in: ["post", "repost", "quote"] },
      createdAt: { $gt: new Date(since.t) },
    };

    if (viewerId) {
      const followRows = await FollowModel.find({ followerId: viewerId, status: "accepted" })
        .select("followeeId")
        .lean();
      query.authorId = { $in: [viewerId, ...followRows.map((f: any) => f.followeeId)] };
    } else {
      query.visibility = "public";
    }

    const count = await PostModel.countDocuments(query);

    return res.json({ newCount: Math.min(count, 50) });
  } catch (err) {
    next(err);
  }
});

export default router;
