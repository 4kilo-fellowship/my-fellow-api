import { Router, Response } from "express";
import { optionalAuth } from "../../platform/auth.js";
import { AuthRequest } from "../../middleware/auth.middleware.js";
import { serializeUserSummary } from "../../platform/serializer.js";
import { hydratePosts } from "../posts/post.service.js";
import {
  ProfileModel,
  PostModel,
  HashtagModel,
  MediaAssetModel,
} from "../../models/social.models.js";

const router = Router();

// GET /api/v1/search
router.get("/search", optionalAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const q = String(req.query.q || "").trim();
    const type = String(req.query.type || "all");
    const viewerId = req.user?.sub;

    if (!q) {
      return res.json({ users: [], posts: [], tags: [] });
    }

    const cleanQ = q.startsWith("#") ? q.slice(1) : q;
    const regex = new RegExp(cleanQ, "i");

    const results: any = {};

    // Search Users
    if (type === "all" || type === "users") {
      const users = await ProfileModel.find({
        $or: [
          { username: regex },
          { displayName: regex },
          { department: regex },
        ],
      })
        .limit(15)
        .lean();

      const avatarIds = users
        .map((u: any) => u.avatarAssetId)
        .filter((id): id is string => Boolean(id));
      const avatars = await MediaAssetModel.find({
        $or: [{ _id: { $in: avatarIds } }, { id: { $in: avatarIds } }],
      }).lean();
      const avatarMap = new Map(avatars.map((a: any) => [a._id ? a._id.toString() : a.id, a]));

      results.users = users.map((u: any) =>
        serializeUserSummary(u, u.avatarAssetId ? avatarMap.get(u.avatarAssetId) : null)
      );
    }

    // Search Posts
    if (type === "all" || type === "posts" || type === "media") {
      const postQuery: any = {
        deletedAt: null,
        visibility: "public",
      };

      if (type === "media") {
        postQuery["media.0"] = { $exists: true };
      }

      if (cleanQ) {
        postQuery.body = regex;
      }

      const posts = await PostModel.find(postQuery)
        .sort({ createdAt: -1 })
        .limit(15)
        .lean();

      results.posts = await hydratePosts(posts, viewerId);
    }

    // Search Tags
    if (type === "all" || type === "tags") {
      const tags = await HashtagModel.find({
        tag: new RegExp(cleanQ.toLowerCase(), "i"),
      })
        .limit(15)
        .lean();

      results.tags = tags.map((t: any) => ({
        tag: `#${t.tag}`,
        rawTag: t.tag,
        postsCount: t.postsCount || 0,
      }));
    }

    return res.json(results);
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/trending/tags
router.get("/trending/tags", async (req, res: Response, next) => {
  try {
    const tags = await HashtagModel.find({})
      .sort({ postsCount: -1 })
      .limit(10)
      .lean();

    const items = tags.map((t: any) => ({
      tag: `#${t.tag}`,
      rawTag: t.tag,
      postsCount: t.postsCount || 0,
      count: t.postsCount || 0,
      category: "Fellowship",
    }));

    return res.json({ items });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/search/suggest
router.get("/search/suggest", async (req, res: Response, next) => {
  try {
    const q = String(req.query.q || "").trim();
    if (!q) {
      return res.json({ suggestions: [] });
    }

    const cleanQ = q.startsWith("#") ? q.slice(1).toLowerCase() : q.toLowerCase();
    const regex = new RegExp(cleanQ, "i");

    const [users, tags] = await Promise.all([
      ProfileModel.find({
        $or: [{ username: regex }, { displayName: regex }],
      })
        .limit(5)
        .select("username displayName")
        .lean(),
      HashtagModel.find({ tag: regex }).limit(5).select("tag").lean(),
    ]);

    const suggestions = [
      ...users.map((u: any) => ({ type: "user", label: `@${u.username}`, text: u.displayName })),
      ...tags.map((t: any) => ({ type: "tag", label: `#${t.tag}`, text: `#${t.tag}` })),
    ];

    return res.json({ suggestions });
  } catch (err) {
    next(err);
  }
});

export default router;
