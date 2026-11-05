import mongoose, { Document, Model, Schema } from "mongoose";

// -------------------------------------------------------------
// MediaAsset
// -------------------------------------------------------------
export interface IMediaAsset {
  ownerId: string;
  purpose: string; // 'post' | 'avatar' | 'cover' | 'highlight'
  status: string; // 'uploading' | 'processing' | 'ready' | 'failed'
  storageKey: string;
  mime?: string;
  bytes?: number | null;
  width?: number;
  height?: number;
  blurhash?: string | null;
  thumbhash?: string | null;
  variants?: Record<string, string>;
  readyAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IMediaAssetDocument extends IMediaAsset, Document {
  id: string;
}

const MediaAssetSchema = new Schema<IMediaAssetDocument>(
  {
    ownerId: { type: String, required: true, index: true },
    purpose: { type: String, default: "post" },
    status: { type: String, default: "ready" },
    storageKey: { type: String, required: true },
    mime: { type: String, default: "image/jpeg" },
    bytes: { type: Number, default: null },
    width: { type: Number, default: 800 },
    height: { type: Number, default: 600 },
    blurhash: { type: String, default: null },
    thumbhash: { type: String, default: null },
    variants: { type: Schema.Types.Mixed, default: {} },
    readyAt: { type: Date, default: () => new Date() },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_, ret: any) => {
        ret.id = ret._id.toString();
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const MediaAssetModel: Model<IMediaAssetDocument> =
  mongoose.models.MediaAsset ||
  mongoose.model<IMediaAssetDocument>("MediaAsset", MediaAssetSchema);

// -------------------------------------------------------------
// Profile & Links
// -------------------------------------------------------------
export interface IProfileLink {
  kind: string; // 'telegram' | 'instagram' | 'youtube' | 'tiktok' | 'website'
  handle?: string | null;
  url: string;
  position: number;
}

export interface IProfile {
  userId: string; // User ID / hex string
  username: string;
  displayName: string;
  bio?: string | null;
  location?: string | null;
  department?: string | null;
  studyYear?: number | null;
  fellowshipRole?: string | null;
  avatarAssetId?: string | null;
  coverAssetId?: string | null;
  isVerified: boolean;
  visibility: string; // 'public' | 'followers'
  showPresence: boolean;
  timezone: string;
  lastSeenAt?: Date | null;
  followersCount: number;
  followingCount: number;
  postsCount: number;
  usernameChangedAt?: Date | null;
  links: IProfileLink[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IProfileDocument extends IProfile, Document {
  id: string;
}

const ProfileLinkSchema = new Schema<IProfileLink>(
  {
    kind: { type: String, required: true },
    handle: { type: String, default: null },
    url: { type: String, required: true },
    position: { type: Number, default: 0 },
  },
  { _id: false }
);

const ProfileSchema = new Schema<IProfileDocument>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    username: { type: String, required: true, unique: true, trim: true, lowercase: true, index: true },
    displayName: { type: String, required: true, trim: true },
    bio: { type: String, default: null },
    location: { type: String, default: null },
    department: { type: String, default: null },
    studyYear: { type: Number, default: null },
    fellowshipRole: { type: String, default: "Fellowship Member" },
    avatarAssetId: { type: String, default: null },
    coverAssetId: { type: String, default: null },
    isVerified: { type: Boolean, default: false },
    visibility: { type: String, default: "public" },
    showPresence: { type: Boolean, default: true },
    timezone: { type: String, default: "Africa/Addis_Ababa" },
    lastSeenAt: { type: Date, default: null },
    followersCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },
    postsCount: { type: Number, default: 0 },
    usernameChangedAt: { type: Date, default: null },
    links: { type: [ProfileLinkSchema], default: [] },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_, ret: any) => {
        ret.id = ret.userId;
        delete ret.__v;
        return ret;
      },
    },
  }
);

ProfileSchema.index({ displayName: "text", department: "text" });

export const ProfileModel: Model<IProfileDocument> =
  mongoose.models.Profile ||
  mongoose.model<IProfileDocument>("Profile", ProfileSchema);

// -------------------------------------------------------------
// Follow & Graph Interactions (Block, Mute)
// -------------------------------------------------------------
export interface IFollow {
  followerId: string;
  followeeId: string;
  status: "accepted" | "pending";
  createdAt?: Date;
}

export interface IFollowDocument extends IFollow, Document {}

const FollowSchema = new Schema<IFollowDocument>(
  {
    followerId: { type: String, required: true, index: true },
    followeeId: { type: String, required: true, index: true },
    status: { type: String, enum: ["accepted", "pending"], default: "accepted" },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

FollowSchema.index({ followerId: 1, followeeId: 1 }, { unique: true });
FollowSchema.index({ followeeId: 1, createdAt: -1 });

export const FollowModel: Model<IFollowDocument> =
  mongoose.models.Follow ||
  mongoose.model<IFollowDocument>("Follow", FollowSchema);

export interface IBlock {
  blockerId: string;
  blockedId: string;
  createdAt?: Date;
}
const BlockSchema = new Schema<IBlock & Document>(
  {
    blockerId: { type: String, required: true, index: true },
    blockedId: { type: String, required: true, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
BlockSchema.index({ blockerId: 1, blockedId: 1 }, { unique: true });
export const BlockModel = mongoose.models.Block || mongoose.model("Block", BlockSchema);

export interface IMute {
  muterId: string;
  mutedId: string;
  createdAt?: Date;
}
const MuteSchema = new Schema<IMute & Document>(
  {
    muterId: { type: String, required: true, index: true },
    mutedId: { type: String, required: true, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
MuteSchema.index({ muterId: 1, mutedId: 1 }, { unique: true });
export const MuteModel = mongoose.models.Mute || mongoose.model("Mute", MuteSchema);

// -------------------------------------------------------------
// Posts, Likes, Bookmarks, Hashtags, Mentions
// -------------------------------------------------------------
export interface IPostMedia {
  assetId: string;
  position: number;
  altText?: string | null;
}

export interface IPost {
  authorId: string;
  authorActorId?: string | null;
  createdByUserId?: string | null;
  kind: "post" | "reply" | "repost" | "quote";
  body?: string | null;
  parentId?: string | null;
  rootId?: string | null;
  repostOfId?: string | null;
  quotedId?: string | null;
  visibility: string;
  media: IPostMedia[];
  mediaAssetIds?: string[];
  replyCount: number;
  repostCount: number;
  likeCount: number;
  quoteCount: number;
  bookmarkCount: number;
  editedAt?: Date | null;
  deletedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IPostDocument extends IPost, Document {
  id: string;
}

const PostMediaSchema = new Schema<IPostMedia>(
  {
    assetId: { type: String, required: true },
    position: { type: Number, default: 0 },
    altText: { type: String, default: null },
  },
  { _id: false }
);

const PostSchema = new Schema<IPostDocument>(
  {
    authorId: { type: String, required: true, index: true },
    authorActorId: { type: String, default: null, index: true },
    createdByUserId: { type: String, default: null, index: true },
    kind: { type: String, enum: ["post", "reply", "repost", "quote"], default: "post", index: true },
    body: { type: String, default: null },
    parentId: { type: String, default: null, index: true },
    rootId: { type: String, default: null, index: true },
    repostOfId: { type: String, default: null, index: true },
    quotedId: { type: String, default: null, index: true },
    visibility: { type: String, default: "public" },
    media: { type: [PostMediaSchema], default: [] },
    mediaAssetIds: { type: [String], default: [] },
    replyCount: { type: Number, default: 0 },
    repostCount: { type: Number, default: 0 },
    likeCount: { type: Number, default: 0 },
    quoteCount: { type: Number, default: 0 },
    bookmarkCount: { type: Number, default: 0 },
    editedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null, index: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_, ret: any) => {
        ret.id = ret._id.toString();
        delete ret.__v;
        return ret;
      },
    },
  }
);

PostSchema.index({ createdAt: -1 });
PostSchema.index({ authorId: 1, createdAt: -1 });
PostSchema.index({ authorActorId: 1, createdAt: -1 });
PostSchema.index({ kind: 1, createdAt: -1 });
PostSchema.index({ body: "text" });

export const PostModel: Model<IPostDocument> =
  mongoose.models.Post ||
  mongoose.model<IPostDocument>("Post", PostSchema);

export interface ILike {
  userId: string;
  postId: string;
  createdAt?: Date;
}
const LikeSchema = new Schema<ILike & Document>(
  {
    userId: { type: String, required: true, index: true },
    postId: { type: String, required: true, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
LikeSchema.index({ userId: 1, postId: 1 }, { unique: true });
export const LikeModel = mongoose.models.Like || mongoose.model("Like", LikeSchema);

export interface IBookmark {
  userId: string;
  postId: string;
  createdAt?: Date;
}
const BookmarkSchema = new Schema<IBookmark & Document>(
  {
    userId: { type: String, required: true, index: true },
    postId: { type: String, required: true, index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
BookmarkSchema.index({ userId: 1, postId: 1 }, { unique: true });
export const BookmarkModel = mongoose.models.Bookmark || mongoose.model("Bookmark", BookmarkSchema);

export interface IHashtag {
  tag: string;
  postsCount: number;
}
const HashtagSchema = new Schema<IHashtag & Document>(
  {
    tag: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    postsCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);
export const HashtagModel = mongoose.models.Hashtag || mongoose.model("Hashtag", HashtagSchema);

export interface IPostHashtag {
  postId: string;
  tag: string;
}
const PostHashtagSchema = new Schema<IPostHashtag & Document>(
  {
    postId: { type: String, required: true, index: true },
    tag: { type: String, required: true, lowercase: true, index: true },
  },
  { timestamps: true }
);
PostHashtagSchema.index({ postId: 1, tag: 1 }, { unique: true });
export const PostHashtagModel = mongoose.models.PostHashtag || mongoose.model("PostHashtag", PostHashtagSchema);

// -------------------------------------------------------------
// Ministries & Ministry Members
// -------------------------------------------------------------
export interface IMinistry {
  slug: string;
  name: string;
  description?: string | null;
  leaderId?: string | null;
  createdAt?: Date;
}
const MinistrySchema = new Schema<IMinistry & Document>(
  {
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: null },
    leaderId: { type: String, default: null },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
export const MinistryModel = mongoose.models.Ministry || mongoose.model("Ministry", MinistrySchema);

export interface IMinistryMember {
  ministrySlug: string;
  userId: string;
  role: string;
  status: string;
  joinedAt?: Date;
}
const MinistryMemberSchema = new Schema<IMinistryMember & Document>(
  {
    ministrySlug: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    role: { type: String, default: "member" },
    status: { type: String, default: "active" },
    joinedAt: { type: Date, default: () => new Date() },
  },
  { timestamps: false }
);
MinistryMemberSchema.index({ ministrySlug: 1, userId: 1 }, { unique: true });
export const MinistryMemberModel = mongoose.models.MinistryMember || mongoose.model("MinistryMember", MinistryMemberSchema);

// -------------------------------------------------------------
// Highlights
// -------------------------------------------------------------
export interface IHighlightItem {
  position: number;
  postId?: string | null;
  assetId?: string | null;
}

export interface IHighlight {
  ownerId: string;
  title: string;
  emoji?: string | null;
  coverAssetId?: string | null;
  position: number;
  items: IHighlightItem[];
  createdAt?: Date;
}
const HighlightSchema = new Schema<IHighlight & Document>(
  {
    ownerId: { type: String, required: true, index: true },
    title: { type: String, required: true, maxlength: 20 },
    emoji: { type: String, default: null },
    coverAssetId: { type: String, default: null },
    position: { type: Number, default: 0 },
    items: {
      type: [
        {
          position: { type: Number, default: 0 },
          postId: { type: String, default: null },
          assetId: { type: String, default: null },
        },
      ],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_, ret: any) => {
        ret.id = ret._id.toString();
        delete ret.__v;
        return ret;
      },
    },
  }
);
export const HighlightModel = mongoose.models.Highlight || mongoose.model("Highlight", HighlightSchema);

// -------------------------------------------------------------
// Content Items (Videos & Sermons)
// -------------------------------------------------------------
export interface IContentItem {
  kind: string;
  createdBy?: string | null;
  title: string;
  description?: string | null;
  durationSeconds?: number | null;
  thumbnailAssetId?: string | null;
  thumbnailUrl?: string | null;
  playbackUrl?: string | null;
  provider?: string | null;
  providerRef?: string | null;
  publishedAt: Date;
  status: string;
}
const ContentItemSchema = new Schema<IContentItem & Document>(
  {
    kind: { type: String, default: "video", index: true },
    createdBy: { type: String, default: null },
    title: { type: String, required: true },
    description: { type: String, default: null },
    durationSeconds: { type: Number, default: null },
    thumbnailAssetId: { type: String, default: null },
    thumbnailUrl: { type: String, default: null },
    playbackUrl: { type: String, default: null },
    provider: { type: String, default: null },
    providerRef: { type: String, default: null },
    publishedAt: { type: Date, default: () => new Date(), index: true },
    status: { type: String, default: "published", index: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_, ret: any) => {
        ret.id = ret._id.toString();
        delete ret.__v;
        return ret;
      },
    },
  }
);
export const ContentItemModel = mongoose.models.ContentItem || mongoose.model("ContentItem", ContentItemSchema);

// -------------------------------------------------------------
// Streaks
// -------------------------------------------------------------
export interface IUserStreak {
  userId: string;
  current: number;
  longest: number;
  lastLocalDate?: string | null;
}
const UserStreakSchema = new Schema<IUserStreak & Document>(
  {
    userId: { type: String, required: true, unique: true, index: true },
    current: { type: Number, default: 0 },
    longest: { type: Number, default: 0 },
    lastLocalDate: { type: String, default: null },
  },
  { timestamps: true }
);
export const UserStreakModel = mongoose.models.UserStreak || mongoose.model("UserStreak", UserStreakSchema);

export interface IStreakDay {
  userId: string;
  localDate: string; // YYYY-MM-DD
}
const StreakDaySchema = new Schema<IStreakDay & Document>(
  {
    userId: { type: String, required: true, index: true },
    localDate: { type: String, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);
StreakDaySchema.index({ userId: 1, localDate: 1 }, { unique: true });
export const StreakDayModel = mongoose.models.StreakDay || mongoose.model("StreakDay", StreakDaySchema);

// -------------------------------------------------------------
// Notifications & Push Devices
// -------------------------------------------------------------
export interface INotification {
  recipientId: string;
  type: string;
  groupKey: string;
  actorIds: string[];
  actorCount: number;
  entityType?: string | null;
  entityId?: string | null;
  data: Record<string, any>;
  readAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}
const NotificationSchema = new Schema<INotification & Document>(
  {
    recipientId: { type: String, required: true, index: true },
    type: { type: String, required: true },
    groupKey: { type: String, required: true },
    actorIds: { type: [String], default: [] },
    actorCount: { type: Number, default: 0 },
    entityType: { type: String, default: null },
    entityId: { type: String, default: null },
    data: { type: Schema.Types.Mixed, default: {} },
    readAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_, ret: any) => {
        ret.id = ret._id.toString();
        delete ret.__v;
        return ret;
      },
    },
  }
);
NotificationSchema.index({ recipientId: 1, updatedAt: -1 });
export const NotificationModel = mongoose.models.Notification || mongoose.model("Notification", NotificationSchema);

export interface IPushDevice {
  userId: string;
  expoPushToken: string;
  platform: string;
  appVersion?: string | null;
  locale: string;
  lastSeenAt: Date;
  disabledAt?: Date | null;
}
const PushDeviceSchema = new Schema<IPushDevice & Document>(
  {
    userId: { type: String, required: true, index: true },
    expoPushToken: { type: String, required: true, unique: true },
    platform: { type: String, default: "unknown" },
    appVersion: { type: String, default: null },
    locale: { type: String, default: "en" },
    lastSeenAt: { type: Date, default: () => new Date() },
    disabledAt: { type: Date, default: null },
  },
  { timestamps: true }
);
export const PushDeviceModel = mongoose.models.PushDevice || mongoose.model("PushDevice", PushDeviceSchema);

// -------------------------------------------------------------
// Outbox & Idempotency
// -------------------------------------------------------------
export interface IOutboxEvent {
  type: string;
  aggregateId?: string | null;
  payload: Record<string, any>;
  processedAt?: Date | null;
  attempts: number;
  lastError?: string | null;
}
const OutboxEventSchema = new Schema<IOutboxEvent & Document>(
  {
    type: { type: String, required: true },
    aggregateId: { type: String, default: null },
    payload: { type: Schema.Types.Mixed, default: {} },
    processedAt: { type: Date, default: null },
    attempts: { type: Number, default: 0 },
    lastError: { type: String, default: null },
  },
  { timestamps: true }
);
export const OutboxEventModel = mongoose.models.OutboxEvent || mongoose.model("OutboxEvent", OutboxEventSchema);

export interface IIdempotencyKey {
  userId: string;
  key: string;
  requestHash: string;
  responseStatus?: number | null;
  responseBody?: any;
}
const IdempotencyKeySchema = new Schema<IIdempotencyKey & Document>(
  {
    userId: { type: String, required: true },
    key: { type: String, required: true },
    requestHash: { type: String, required: true },
    responseStatus: { type: Number, default: null },
    responseBody: { type: Schema.Types.Mixed, default: null },
  },
  { timestamps: true }
);
IdempotencyKeySchema.index({ userId: 1, key: 1 }, { unique: true });
export const IdempotencyKeyModel = mongoose.models.IdempotencyKey || mongoose.model("IdempotencyKey", IdempotencyKeySchema);

// -------------------------------------------------------------
// Actor & TeamMember
// -------------------------------------------------------------
export type ActorType = "user" | "team" | "official";

export interface IActor {
  type: ActorType;
  displayName: string;
  handle: string;
  avatarUrl?: string | null;
  bio?: string | null;
  isVerified?: boolean;
  userId?: string | null;
  teamId?: string | null;
  deletedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IActorDocument extends IActor, Document {
  id: string;
}

const ActorSchema = new Schema<IActorDocument>(
  {
    type: { type: String, enum: ["user", "team", "official"], required: true, index: true },
    displayName: { type: String, required: true },
    handle: { type: String, required: true, unique: true, index: true },
    avatarUrl: { type: String, default: null },
    bio: { type: String, default: null },
    isVerified: { type: Boolean, default: false },
    userId: { type: String, default: null, index: true },
    teamId: { type: String, default: null, index: true },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_, ret: any) => {
        ret.id = ret._id.toString();
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const ActorModel: Model<IActorDocument> =
  mongoose.models.Actor || mongoose.model<IActorDocument>("Actor", ActorSchema);

export type TeamMemberRole = "owner" | "editor" | "member";

export interface ITeamMember {
  actorId: string;
  userId: string;
  role: TeamMemberRole;
  addedByUserId?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ITeamMemberDocument extends ITeamMember, Document {
  id: string;
}

const TeamMemberSchema = new Schema<ITeamMemberDocument>(
  {
    actorId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    role: { type: String, enum: ["owner", "editor", "member"], default: "editor" },
    addedByUserId: { type: String, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_, ret: any) => {
        ret.id = ret._id.toString();
        delete ret.__v;
        return ret;
      },
    },
  }
);

TeamMemberSchema.index({ actorId: 1, userId: 1 }, { unique: true });

export const TeamMemberModel: Model<ITeamMemberDocument> =
  mongoose.models.TeamMember || mongoose.model<ITeamMemberDocument>("TeamMember", TeamMemberSchema);

