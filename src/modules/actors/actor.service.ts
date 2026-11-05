import { ActorModel, TeamMemberModel, ProfileModel, MediaAssetModel, IActorDocument } from "../../models/social.models.js";
import { UserModel } from "../../models/user.model.js";
import { TeamModel } from "../../models/team.model.js";
import { TeamMembershipModel } from "../../models/rbac.model.js";
import { normalizeRole } from "../../rbac/permissions.js";

export const CANONICAL_TEAMS = [
  {
    teamId: "Bible Study",
    displayName: "Bible Study",
    handle: "biblestudy",
    bio: "Deep scripture study, weekly cell groups & discipleship.",
    avatarUrl: "https://images.unsplash.com/photo-1507692049790-de58290a4334?w=400&q=80",
    isVerified: true,
  },
  {
    teamId: "Evangelism",
    displayName: "Evangelism",
    handle: "evangelism",
    bio: "Sharing the Gospel across campus and university outreach.",
    avatarUrl: "https://images.unsplash.com/photo-1519491050282-cf00c82424b4?w=400&q=80",
    isVerified: true,
  },
  {
    teamId: "Worship",
    displayName: "Worship",
    handle: "worship",
    bio: "Acoustic teams, praise, and leading fellowship worship.",
    avatarUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=400&q=80",
    isVerified: true,
  },
  {
    teamId: "I4U",
    displayName: "I4U",
    handle: "i4u",
    bio: "Care, encouragement, mutual support, and student welfare.",
    avatarUrl: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&q=80",
    isVerified: true,
  },
  {
    teamId: "Media",
    displayName: "Media & Literature",
    handle: "media",
    bio: "Media, literature, publications, and fellowship media.",
    avatarUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=400&q=80",
    isVerified: true,
  },
  {
    teamId: "Prayer",
    displayName: "Prayer",
    handle: "prayer",
    bio: "Intercession, morning prayers, and fellowship fasting nights.",
    avatarUrl: "https://images.unsplash.com/photo-1544717302-de2939b7ef71?w=400&q=80",
    isVerified: true,
  },
  {
    teamId: "Freshman",
    displayName: "Freshman",
    handle: "freshman",
    bio: "Welcoming and guiding new campus students in faith and life.",
    avatarUrl: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=400&q=80",
    isVerified: true,
  },
  {
    teamId: "Other",
    displayName: "Other Ministry",
    handle: "fellowship_ministry",
    bio: "General fellowship member and community ministries.",
    avatarUrl: "https://images.unsplash.com/photo-1517048676732-d65bc937f952?w=400&q=80",
    isVerified: true,
  },
] as const;

export const OFFICIAL_ACTOR = {
  type: "official" as const,
  displayName: "4 Kilo Christian Students Fellowship",
  handle: "4kilo_ecsf",
  bio: "Official voice and reflections of 4 Kilo Christian Students Fellowship (AAU ECSF).",
  avatarUrl: "https://images.unsplash.com/photo-1543269865-cbf427effbad?w=400&q=80",
  isVerified: true,
};

export async function ensureDefaultActors(): Promise<void> {
  try {
    // 1. Ensure Official Actor
    await ActorModel.findOneAndUpdate(
      { handle: OFFICIAL_ACTOR.handle },
      {
        $set: {
          type: OFFICIAL_ACTOR.type,
          displayName: OFFICIAL_ACTOR.displayName,
          handle: OFFICIAL_ACTOR.handle,
          bio: OFFICIAL_ACTOR.bio,
          avatarUrl: OFFICIAL_ACTOR.avatarUrl,
          isVerified: OFFICIAL_ACTOR.isVerified,
          deletedAt: null,
        },
      },
      { upsert: true, new: true }
    );

    // 2. Ensure 8 Fellowship Team Actors
    for (const team of CANONICAL_TEAMS) {
      await ActorModel.findOneAndUpdate(
        { handle: team.handle },
        {
          $set: {
            type: "team",
            displayName: team.displayName,
            handle: team.handle,
            bio: team.bio,
            avatarUrl: team.avatarUrl,
            isVerified: team.isVerified,
            teamId: team.teamId,
            deletedAt: null,
          },
        },
        { upsert: true, new: true }
      );
    }
  } catch (err) {
    console.error("[ensureDefaultActors] Error initializing actors:", err);
  }
}

export interface ActorSummaryPayload {
  id: string;
  type: "user" | "team" | "official";
  displayName: string;
  handle: string;
  avatarUrl?: string | null;
  bio?: string | null;
  isVerified: boolean;
  teamId?: string | null;
}

export async function canPostAs(
  user: { sub: string; role?: string },
  actorIdOrHandle: string
): Promise<{ allowed: boolean; actor?: IActorDocument | null }> {
  if (!actorIdOrHandle || actorIdOrHandle === "me") {
    return { allowed: true, actor: null };
  }

  const actor = await ActorModel.findOne({
    $or: [{ _id: actorIdOrHandle.match(/^[0-9a-fA-F]{24}$/) ? actorIdOrHandle : null }, { handle: actorIdOrHandle }],
    deletedAt: null,
  });

  if (!actor) {
    return { allowed: false, actor: null };
  }

  // If actor is personal user
  if (actor.type === "user") {
    return {
      allowed: actor.userId === user.sub,
      actor,
    };
  }

  const userRole = normalizeRole(user.role);
  const isSuperOrLeader = userRole === "super_admin" || userRole === "leader";

  // Official Actor: Leaders & Super Admins, or explicit owner/editor in TeamMemberModel
  if (actor.type === "official") {
    if (isSuperOrLeader) {
      return { allowed: true, actor };
    }
    const hasMembership = await TeamMemberModel.exists({
      actorId: actor._id.toString(),
      userId: user.sub,
      role: { $in: ["owner", "editor"] },
    });
    return { allowed: Boolean(hasMembership), actor };
  }

  // Team Actor
  if (actor.type === "team") {
    // 1. Super Admins & Leaders can post as any team
    if (isSuperOrLeader) {
      return { allowed: true, actor };
    }

    // 2. Explicit membership in TeamMemberModel
    const hasActorMembership = await TeamMemberModel.exists({
      actorId: actor._id.toString(),
      userId: user.sub,
    });
    if (hasActorMembership) {
      return { allowed: true, actor };
    }

    // 3. User's assigned team in UserModel (personalization selection)
    const userDoc = await UserModel.findById(user.sub).lean();
    if (userDoc) {
      if (userDoc.team) {
        // user.team could be ObjectId of a Team or string matching team name/id
        const teamDoc = await TeamModel.findById(userDoc.team).lean();
        if (
          teamDoc?.name?.toLowerCase() === actor.displayName.toLowerCase() ||
          String(userDoc.team) === actor.teamId ||
          String(userDoc.team) === actor._id.toString()
        ) {
          return { allowed: true, actor };
        }
      }

      // Check TeamMembershipModel
      const hasTeamMembership = await TeamMembershipModel.exists({
        userId: user.sub,
      });
      if (hasTeamMembership) {
        return { allowed: true, actor };
      }
    }
  }

  return { allowed: false, actor };
}

export async function getPostableActors(user: { sub: string; role?: string }): Promise<ActorSummaryPayload[]> {
  await ensureDefaultActors();

  const [userDoc, profileDoc] = await Promise.all([
    UserModel.findById(user.sub).lean(),
    ProfileModel.findOne({ userId: user.sub }).lean(),
  ]);

  let userAvatarUrl: string | null = null;
  if (profileDoc?.avatarAssetId) {
    const asset = await MediaAssetModel.findById(profileDoc.avatarAssetId).lean();
    if (asset?.variants?.md || asset?.storageKey) {
      userAvatarUrl = asset.variants?.md || asset.storageKey;
    }
  } else if (userDoc?.profileImage) {
    userAvatarUrl = userDoc.profileImage;
  }

  const personalActor: ActorSummaryPayload = {
    id: "me",
    type: "user",
    displayName: profileDoc?.displayName || userDoc?.fullName || "Fellowship Member",
    handle: profileDoc?.username || (userDoc?.fullName || "member").toLowerCase().replace(/\s+/g, ""),
    avatarUrl: userAvatarUrl,
    bio: profileDoc?.bio || null,
    isVerified: Boolean(profileDoc?.isVerified),
  };

  const results: ActorSummaryPayload[] = [personalActor];

  // Fetch all active actors
  const actors = await ActorModel.find({ deletedAt: null }).lean();

  for (const a of actors) {
    if (a.type === "user") continue;
    const { allowed } = await canPostAs(user, a._id.toString());
    if (allowed) {
      results.push({
        id: a._id.toString(),
        type: a.type as "team" | "official",
        displayName: a.displayName,
        handle: a.handle,
        avatarUrl: a.avatarUrl,
        bio: a.bio,
        isVerified: Boolean(a.isVerified),
        teamId: a.teamId,
      });
    }
  }

  return results;
}
