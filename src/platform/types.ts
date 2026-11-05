export type MediaRef = {
  id: string;
  kind: "image" | "video";
  width: number;
  height: number;
  blurhash?: string;
  thumbhash?: string;
  urls: {
    sm: string;
    md: string;
    lg: string;
    original?: string;
  };
  alt?: string;
};

export type UserSummary = {
  id: string;
  username: string;
  displayName: string;
  avatar: MediaRef | null;
  isVerified: boolean;
  fellowshipRole?: string | null;
  ministryBadge?: string | null;
};

export type ActorSummary = {
  id: string;
  type: "user" | "team" | "official";
  displayName: string;
  handle: string;
  avatarUrl?: string | null;
  bio?: string | null;
  isVerified: boolean;
};

export type PostResponse = {
  id: string;
  kind: "post" | "reply" | "repost" | "quote";
  author: UserSummary;
  authorActor?: ActorSummary | null;
  createdByUserId?: string | null;
  body: string | null;
  createdAt: string;
  editedAt?: string | null;
  media: MediaRef[];
  replyTo?: { id: string; authorUsername: string } | null;
  repostOf?: PostResponse | null;
  quoted?: PostResponse | null;
  counts: {
    replies: number;
    reposts: number;
    likes: number;
    quotes?: number;
  };
  viewer: {
    liked: boolean;
    reposted: boolean;
    bookmarked: boolean;
  };
  tombstone?: "deleted" | "unavailable";
};

export type ProfileDetail = UserSummary & {
  cover: MediaRef | null;
  bio: string | null;
  location: string | null;
  joinedAt: string;
  links: { kind: string; handle?: string; url: string }[];
  academic: { department?: string; studyYear?: number; label?: string };
  badges: { kind: "ministry" | "academic" | "streak" | "role"; label: string }[];
  streak: { current: number } | null;
  counts: { following: number; connects: number; reflections: number };
  presence: { online: boolean; lastSeenAt?: string | null } | null;
  viewer: {
    isSelf: boolean;
    following: boolean;
    followedBy: boolean;
    pendingRequest: boolean;
    blocked: boolean;
    blockedBy: boolean;
    muted: boolean;
  };
  followedByPreview: { total: number; users: UserSummary[] };
  highlights: { id: string; title: string; emoji?: string; cover: MediaRef | null }[];
};
