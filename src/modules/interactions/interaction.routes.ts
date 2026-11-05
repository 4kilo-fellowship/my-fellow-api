import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../../middleware/auth.middleware.js";
import { AppError } from "../../platform/errors.js";
import { hydratePosts } from "../posts/post.service.js";
import { buildPaginatedResponse, decodeCursor } from "../../platform/pagination.js";
import { routeParam } from "../../utils/routeParam.js";
import {
  PostModel,
  LikeModel,
  BookmarkModel,
  OutboxEventModel,
} from "../../models/social.models.js";

const router = Router();

// PUT /api/v1/posts/:id/like
router.put("/posts/:id/like", requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = req.user!.sub;
    const postId = routeParam(req.params.id);

    const post = await PostModel.findOne({ _id: postId, deletedAt: null });
    if (!post) throw AppError.notFound("Post not found", "POST_NOT_FOUND");

    const existing = await LikeModel.findOne({ userId, postId });
    if (existing) {
      return res.json({ liked: true, likeCount: post.likeCount });
    }

    await LikeModel.create({ userId, postId });
    post.likeCount = (post.likeCount || 0) + 1;
    await post.save();

    if (post.authorId !== userId) {
      await OutboxEventModel.create({
        type: "like.created",
        aggregateId: postId,
        payload: {
          actorId: userId,
          recipientId: post.authorId,
          postId,
        },
      });
    }

    return res.json({ liked: true, likeCount: post.likeCount });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/posts/:id/like
router.delete("/posts/:id/like", requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = req.user!.sub;
    const postId = routeParam(req.params.id);

    const deleted = await LikeModel.findOneAndDelete({ userId, postId });
    if (!deleted) {
      const p = await PostModel.findById(postId).lean();
      return res.json({ liked: false, likeCount: (p as any)?.likeCount || 0 });
    }

    const post = await PostModel.findById(postId);
    let newCount = 0;
    if (post) {
      post.likeCount = Math.max(0, (post.likeCount || 0) - 1);
      await post.save();
      newCount = post.likeCount;
    }

    return res.json({ liked: false, likeCount: newCount });
  } catch (err) {
    next(err);
  }
});

// PUT /api/v1/posts/:id/bookmark
router.put("/posts/:id/bookmark", requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = req.user!.sub;
    const postId = routeParam(req.params.id);

    const post = await PostModel.findOne({ _id: postId, deletedAt: null });
    if (!post) throw AppError.notFound("Post not found", "POST_NOT_FOUND");

    const existing = await BookmarkModel.findOne({ userId, postId });
    if (existing) {
      return res.json({ bookmarked: true });
    }

    await BookmarkModel.create({ userId, postId });
    post.bookmarkCount = (post.bookmarkCount || 0) + 1;
    await post.save();

    return res.json({ bookmarked: true });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/v1/posts/:id/bookmark
router.delete("/posts/:id/bookmark", requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = req.user!.sub;
    const postId = routeParam(req.params.id);

    const deleted = await BookmarkModel.findOneAndDelete({ userId, postId });
    if (deleted) {
      const post = await PostModel.findById(postId);
      if (post) {
        post.bookmarkCount = Math.max(0, (post.bookmarkCount || 0) - 1);
        await post.save();
      }
    }

    return res.json({ bookmarked: false });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/me/bookmarks
router.get("/me/bookmarks", requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const userId = req.user!.sub;
    const limit = Math.min(Number(req.query.limit) || 20, 50);
    const cursor = decodeCursor(req.query.cursor as string);

    const query: any = { userId };
    if (cursor) {
      query.createdAt = { $lt: new Date(cursor.t) };
    }

    const bookmarkEntries = await BookmarkModel.find(query)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .lean();

    const postIds = bookmarkEntries.map((b: any) => b.postId);
    const posts = await PostModel.find({
      _id: { $in: postIds },
      deletedAt: null,
    }).lean();
    const postMap = new Map(posts.map((p: any) => [p._id.toString(), p]));

    const activeEntries = bookmarkEntries
      .map((b: any) => ({ ...b, post: postMap.get(b.postId) }))
      .filter((b: any) => Boolean(b.post));

    const paginated = buildPaginatedResponse(activeEntries, limit, (item: any) => ({
      t: new Date(item.createdAt).toISOString(),
      id: item.postId,
    }));

    const hydratedPosts = await hydratePosts(
      paginated.items.map((i: any) => i.post),
      userId
    );

    return res.json({
      items: hydratedPosts,
      nextCursor: paginated.nextCursor,
      hasMore: paginated.hasMore,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
