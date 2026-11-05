import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../../middleware/auth.middleware.js";
import { optionalAuth } from "../../platform/auth.js";
import { AppError } from "../../platform/errors.js";
import { routeParam } from "../../utils/routeParam.js";
import {
  MinistryModel,
  MinistryMemberModel,
  ProfileModel,
  MediaAssetModel,
} from "../../models/social.models.js";
import { serializeUserSummary } from "../../platform/serializer.js";

const router = Router();

// GET /api/v1/ministries
router.get("/ministries", async (req, res: Response, next) => {
  try {
    const ministries = await MinistryModel.find({}).sort({ name: 1 }).lean();
    return res.json({ items: ministries });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/ministries/:slug
router.get("/ministries/:slug", optionalAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const slug = routeParam(req.params.slug);
    const viewerId = req.user?.sub;

    const ministry = await MinistryModel.findOne({ slug }).lean();
    if (!ministry) throw AppError.notFound("Ministry not found", "MINISTRY_NOT_FOUND");

    const memberDocs = await MinistryMemberModel.find({ ministrySlug: slug, status: "active" })
      .limit(10)
      .lean();
    const userIds = memberDocs.map((m: any) => m.userId);

    const profiles = await ProfileModel.find({ userId: { $in: userIds } }).lean();
    const avatarIds = profiles.map((p: any) => p.avatarAssetId).filter(Boolean);
    const avatars = await MediaAssetModel.find({
      $or: [{ _id: { $in: avatarIds } }, { id: { $in: avatarIds } }],
    }).lean();
    const avatarMap = new Map(avatars.map((a: any) => [a._id ? a._id.toString() : a.id, a]));

    const members = profiles.map((p: any) =>
      serializeUserSummary(p, p.avatarAssetId ? avatarMap.get(p.avatarAssetId) : null)
    );

    let isMember = false;
    if (viewerId) {
      const membership = await MinistryMemberModel.findOne({
        ministrySlug: slug,
        userId: viewerId,
        status: "active",
      }).lean();
      isMember = Boolean(membership);
    }

    const membersCount = await MinistryMemberModel.countDocuments({
      ministrySlug: slug,
      status: "active",
    });

    return res.json({
      ...(ministry as any),
      membersCount,
      members,
      isMember,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/ministries/:slug/join
router.post("/ministries/:slug/join", requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const slug = routeParam(req.params.slug);
    const userId = req.user!.sub;

    const ministry = await MinistryModel.findOne({ slug }).lean();
    if (!ministry) throw AppError.notFound("Ministry not found", "MINISTRY_NOT_FOUND");

    await MinistryMemberModel.updateOne(
      { ministrySlug: slug, userId },
      { $set: { ministrySlug: slug, userId, role: "member", status: "active", joinedAt: new Date() } },
      { upsert: true }
    );

    return res.json({ success: true, joined: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/v1/ministries/:slug/leave
router.post("/ministries/:slug/leave", requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const slug = routeParam(req.params.slug);
    const userId = req.user!.sub;

    await MinistryMemberModel.deleteOne({ ministrySlug: slug, userId });
    return res.json({ success: true, joined: false });
  } catch (err) {
    next(err);
  }
});

export default router;
