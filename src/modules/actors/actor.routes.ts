import { Router, Response } from "express";
import { requireAuth, AuthRequest } from "../../middleware/auth.middleware.js";
import { optionalAuth } from "../../platform/auth.js";
import { AppError } from "../../platform/errors.js";
import { routeParam } from "../../utils/routeParam.js";
import { ActorModel } from "../../models/social.models.js";
import { getPostableActors, ensureDefaultActors } from "./actor.service.js";

const router = Router();

// GET /api/v1/me/postable-actors
router.get("/me/postable-actors", requireAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const user = {
      sub: req.user!.sub,
      role: req.user!.role,
    };
    const actors = await getPostableActors(user);
    return res.json({ actors });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/actors
router.get("/actors", optionalAuth, async (_req: AuthRequest, res: Response, next) => {
  try {
    await ensureDefaultActors();
    const actors = await ActorModel.find({ deletedAt: null }).sort({ type: -1, displayName: 1 }).lean();
    return res.json({
      actors: actors.map((a: any) => ({
        id: a._id.toString(),
        type: a.type,
        displayName: a.displayName,
        handle: a.handle,
        avatarUrl: a.avatarUrl,
        bio: a.bio,
        isVerified: Boolean(a.isVerified),
        teamId: a.teamId,
      })),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/v1/actors/:id
router.get("/actors/:id", optionalAuth, async (req: AuthRequest, res: Response, next) => {
  try {
    const id = routeParam(req.params.id);
    const actor = await ActorModel.findOne({
      $or: [{ _id: id.match(/^[0-9a-fA-F]{24}$/) ? id : null }, { handle: id }],
      deletedAt: null,
    }).lean();

    if (!actor) {
      throw AppError.notFound("Actor not found", "ACTOR_NOT_FOUND");
    }

    return res.json({
      id: (actor as any)._id.toString(),
      type: (actor as any).type,
      displayName: (actor as any).displayName,
      handle: (actor as any).handle,
      avatarUrl: (actor as any).avatarUrl,
      bio: (actor as any).bio,
      isVerified: Boolean((actor as any).isVerified),
      teamId: (actor as any).teamId,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
