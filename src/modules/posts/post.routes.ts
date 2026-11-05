import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../../middleware/auth.middleware.js";
import { optionalAuth } from "../../platform/auth.js";
import { AppError } from "../../platform/errors.js";
import { hydratePosts } from "./post.service.js";
import { buildPaginatedResponse, decodeCursor } from "../../platform/pagination.js";
import { routeParam } from "../../utils/routeParam.js";
import { recordStreakCheckIn } from "../streaks/streak.service.js";
import {
  PostModel,
  ProfileModel,
  HashtagModel,
  PostHashtagModel,
  OutboxEventModel,
} from "../../models/social.models.js";

const router = Router();

// POST /api/v1/posts
router.post("/posts", requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const authorId = req.user!.sub;
    const { body, mediaAssetIds, parentId, quotedId, visibility = "public" } = req.body;

    const trimmedBody = body ? String(body).trim() : null;
    const mediaIds = Array.isArray(mediaAssetIds) ? mediaAssetIds : [];

    if (!trimmedBody && mediaIds.length === 0) {
      throw AppError.badRequest("Post must have text or media", "EMPTY_POST");
    }

    if (trimmedBody && trimmedBody.length > 500) {
      throw AppError.badRequest("Post body cannot exceed 500 characters", "POST_TOO_LONG");
    }

    // Determine kind
    let kind: "post" | "reply" | "quote" = "post";
    let rootId: string | null = null;
    let parentAuthorId: string | null = null;

    if (parentId) {
      const parent = await PostModel.findOne({ _id: parentId, deletedAt: null }).lean();
      if (!parent) throw AppError.notFound("Parent post not found", "PARENT_NOT_FOUND");
      kind = "reply";
      rootId = (parent as any).rootId || (parent as any)._id.toString();
      parentAuthorId = (parent as any).authorId;
    } else if (quotedId) {
      const quoted = await PostModel.findOne({ _id: quotedId, deletedAt: null }).lean();
      if (!quoted) throw AppError.notFound("Quoted post not found", "QUOTED_NOT_FOUND");
      kind = "quote";
    }

    const mediaList = mediaIds.slice(0, 4).map((assetId: string, index: number) => ({
      assetId,
      position: index,
    }));

    const postDoc = await PostModel.create({
      authorId,
      kind,
      body: trimmedBody,
      parentId: parentId || null,
      rootId,
      quotedId: quotedId || null,
      visibility,
      media: mediaList,
      mediaAssetIds: mediaIds,
    });

    const postId = postDoc._id.toString();

    // Hashtag extraction
    if (trimmedBody) {
      const tagMatches = trimmedBody.match(/#([a-zA-Z0-9_]+)/g);
      if (tagMatches) {
        const uniqueTags = Array.from(new Set(tagMatches.map((t) => t.slice(1).toLowerCase())));
        for (const tag of uniqueTags) {
          await HashtagModel.updateOne(
            { tag },
            { $inc: { postsCount: 1 } },
            { upsert: true }
          );
          await PostHashtagModel.updateOne(
            { postId, tag },
            { $set: { postId, tag } },
            { upsert: true }
          );
        }
      }
    }

    // Update counters
    if (kind === "post" || kind === "quote") {
      await ProfileModel.updateOne(
        { userId: authorId },
        { $inc: { postsCount: 1 } }
      );
    } else if (kind === "reply" && parentId) {
      await PostModel.updateOne(
        { _id: parentId },
        { $inc: { replyCount: 1 } }
      );

      if (parentAuthorId && parentAuthorId !== authorId) {
        await OutboxEventModel.create({
          type: "reply.created",
          aggregateId: parentId,
          payload: {
            actorId: authorId,
            recipientId: parentAuthorId,
            postId,
          },
        });
      }
    }

    if (quotedId) {
      await PostModel.updateOne(
        { _id: quotedId },
        { $inc: { quoteCount: 1 } }
      );
    }

    await OutboxEventModel.create({
      type: "post.created",
      aggregateId: postId,
      payload: {
        postId,
        authorId,
        kind,
      },
    });

    // Auto check-in streak on successful reflection post
    try {
      await recordStreakCheckIn(authorId, "post");
    } catch (streakErr) {
      console.error("[Post Streak Auto-Checkin]:", streakErr);
    }

    const [hydrated] = await hydratePosts([postDoc.toJSON()], authorId);
    return res.status(201).json(hydrated);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/posts/:id
router.get("/posts/:id", optionalAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const id = routeParam(req.params.id);
    const viewerId = req.user?.sub;

    const post = await PostModel.findOne({ _id: id, deletedAt: null }).lean();
    if (!post) throw AppError.notFound("Post not found", "POST_NOT_FOUND");

    const [hydrated] = await hydratePosts([post], viewerId);
    return res.json(hydrated);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/posts/:id/thread
router.get("/posts/:id/thread", optionalAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const id = routeParam(req.params.id);
    const viewerId = req.user?.sub;

    const post = await PostModel.findOne({ _id: id }).lean();
    if (!post) throw AppError.notFound("Post not found", "POST_NOT_FOUND");

    const ancestors: any[] = [];
    let currentParentId = (post as any).parentId;
    let depth = 0;

    while (currentParentId && depth < 5) {
      const parent = await PostModel.findOne({ _id: currentParentId }).lean();
      if (!parent) break;
      ancestors.unshift(parent);
      currentParentId = (parent as any).parentId;
      depth++;
    }

    const replies = await PostModel.find({
      parentId: id,
      deletedAt: null,
    })
      .sort({ createdAt: 1 })
      .limit(30)
      .lean();

    const allToHydrate = [...ancestors, post, ...replies];
    const hydratedAll = await hydratePosts(allToHydrate, viewerId);

    const hydratedAncestors = hydratedAll.slice(0, ancestors.length);
    const hydratedPost = hydratedAll[ancestors.length];
    const hydratedReplies = hydratedAll.slice(ancestors.length + 1);

    return res.json({
      ancestors: hydratedAncestors,
      post: hydratedPost,
      replies: hydratedReplies,
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/posts/:id
router.delete("/posts/:id", requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const id = routeParam(req.params.id);
    const userId = req.user!.sub;

    const post = await PostModel.findOne({ _id: id, deletedAt: null });
    if (!post) throw AppError.notFound("Post not found", "POST_NOT_FOUND");

    if (post.authorId !== userId) {
      throw AppError.forbidden("You cannot delete another member's post", "FORBIDDEN");
    }

    post.deletedAt = new Date();
    await post.save();

    if (post.kind === "post" || post.kind === "quote") {
      await ProfileModel.updateOne(
        { userId: post.authorId },
        { $inc: { postsCount: -1 } }
      );
    } else if (post.kind === "reply" && post.parentId) {
      await PostModel.updateOne(
        { _id: post.parentId },
        { $inc: { replyCount: -1 } }
      );
    }

    return res.json({ success: true, tombstone: "deleted" });
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/posts/:id/repost
router.put("/posts/:id/repost", requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const targetPostId = routeParam(req.params.id);
    const userId = req.user!.sub;

    const targetPost = await PostModel.findOne({ _id: targetPostId, deletedAt: null });
    if (!targetPost) throw AppError.notFound("Post not found", "POST_NOT_FOUND");

    const existingRepost = await PostModel.findOne({
      authorId: userId,
      kind: "repost",
      repostOfId: targetPostId,
      deletedAt: null,
    });

    if (existingRepost) {
      return res.json({ reposted: true, repostId: existingRepost._id.toString() });
    }

    const repostDoc = await PostModel.create({
      authorId: userId,
      kind: "repost",
      repostOfId: targetPostId,
      visibility: "public",
    });

    await PostModel.updateOne(
      { _id: targetPostId },
      { $inc: { repostCount: 1 } }
    );

    return res.json({ reposted: true, repostId: repostDoc._id.toString() });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/posts/:id/repost
router.delete("/posts/:id/repost", requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const targetPostId = routeParam(req.params.id);
    const userId = req.user!.sub;

    const repost = await PostModel.findOne({
      authorId: userId,
      kind: "repost",
      repostOfId: targetPostId,
      deletedAt: null,
    });

    if (!repost) {
      return res.json({ reposted: false });
    }

    repost.deletedAt = new Date();
    await repost.save();

    await PostModel.updateOne(
      { _id: targetPostId },
      { $inc: { repostCount: -1 } }
    );

    return res.json({ reposted: false });
  } catch (err) {
    next(err);
  }
});

export default router;
