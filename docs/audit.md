# 4K Social Platform: Phase 0 System Audit & Plan

**Date:** October 31, 2026  
**Auditor:** Senior System & Backend Agent  
**Audience:** Development Team & Reviewers  

---

## 1. Backend Runtime & Framework Audit (`my-fellow-api`)

### 1.1 Runtime & Framework Versions
- **Node Version Engine:** `>=24.0.0 <25` (specified in `package.json`).
- **Module System:** ESM (`"type": "module"` in `package.json`, `"module": "NodeNext"`, `"target": "ES2022"` in `tsconfig.json`).
- **Framework:** Express `5.2.1`.
- **TypeScript:** `5.9.3` with strict mode enabled (`"strict": true`).
- **Dev Runtime:** `nodemon --exec tsx src/server.ts`.
- **Build Script:** `prisma generate && tsc`.

### 1.2 Better Auth Configuration & State
- **Better Auth Version:** `1.7.14` (with `@better-auth/expo: 1.7.14`).
- **Adapter / Database:** MongoDB via `mongodbAdapter(mongoDb)` in `src/auth.ts`.
- **Plugins Enabled:**
  - `expo()` for mobile native auth and deep linking.
  - `bearer()` for Bearer token extraction from HTTP headers.
  - `phoneNumber({ ... })` for 6-digit OTP delivery via GeezSMS gateway.
- **Catch-All Mounting:** Mounted in `src/app.ts` before `express.json()` using Express 5 splat syntax: `["/api/auth", "/api/auth/*splat"]`.
- **Custom Auth Coexistence:** Legacy custom endpoints (`/api/auth/phone/send-otp`, `/api/auth/phone/verify-otp`, `/api/auth/signin`, etc.) route through `auth.routes.ts`. `auth.middleware.ts` supports both Better Auth session validation and JWT fallback.

### 1.3 Database Architecture & Storage Status
- **Dual Engine Architecture:**
  - **MongoDB Atlas (`MONGO_URI`):** Hosts Better Auth collections (`users`, `sessions`) and core fellowship domain collections (`User`, `Event`, `Devotion`, `Leader`, `Location`, `Program`, `Team`, `JoinRequest`, `Registration`, `Support`, `OtpRecord`, `Transaction`).
  - **PostgreSQL (`DATABASE_URL` via Supabase):** Prisma 7.10.0 + `@prisma/adapter-pg`. Schema currently holds Marketplace tables (`Product`, `Order`, `OrderItem`).
- **Social Domain State:** Zero social tables exist in either database. No models for posts/reflections, comments, likes, reposts, bookmarks, follows, highlights, media, or streaks.

### 1.4 Middleware, Validation, Error Handling & Logging
- **Middleware Chain:** `trust proxy` → `helmet` → `cors` → Better Auth handler → `express.json()` → route rate limiters → route routers.
- **Validation:** Zod (`zod: ^4.6.5`) via `validate(schema)` middleware on `{ body, query, params }`.
- **Error Handling:** Lacks centralized RFC 9457 Problem Details error handler.
- **Logging:** Basic `console.log` / `console.error`; needs structured Pino logger with request IDs.
- **Testing:** No test suites currently in `my-fellow-api`.

---

## 2. Frontend Social Layer Audit (`my-fellow`)

### 2.1 Runtime & Dependencies
- **Core:** Expo SDK `58.0.0`, React `19.3.0`, React Native `0.88.0`.
- **Routing:** Expo Router `58.0.27`.
- **Animation & Gestures:** React Native Reanimated `4.7.1`, Gesture Handler `3.3.0`, Worklets `0.13.0`.
- **Images:** `expo-image: ~58.0.17`.
- **State & Storage:** Zustand 4.5.7, AsyncStorage 2.2.0, SecureStore 58.0.2.

### 2.2 Hard-Coded Sources & Target Endpoint Mapping

| Screen / Component | File Path | Hard-Coded Literals & Data Sources | Target Endpoint(s) | Phase |
| :--- | :--- | :--- | :--- | :--- |
| **Home: Video Content Library** | `app/(tabs)/index.tsx`<br>`constants/videos.ts` | Static array `VIDEOS` with 6 videos: Sunday Service Highlights, Acoustic Worship Night, etc. | `GET /api/content/videos` | Phase 2 |
| **Home: Who to Follow Carousel** | `components/WhoToFollow/index.tsx` | Static array `DEFAULT_MEMBERS`: "Abenezer Bekele" (28 mutual), "Hiwot Tadesse" (34 mutual), "Yohannes Hailu", "Bethelhem Assefa", "Natnael Tamiru". | `GET /api/users/suggestions`<br>`POST /api/users/:id/follow`<br>`DELETE /api/users/:id/suggestions` | Phase 1 |
| **Home: Streaks Chip** | `app/(tabs)/index.tsx`<br>`stores/streak.store.ts` | Local AsyncStorage only (`fellowship-streak-storage`). Defaults to `1`. No server validation. | `GET /api/streaks/me`<br>`POST /api/streaks/checkin` | Phase 3 |
| **Home: Notification Bell** | `app/(tabs)/index.tsx`<br>`utils/notificationService.ts` | Synthesized locally by polling events and marketplace. | `GET /api/notifications`<br>`GET /api/notifications/unread-count`<br>`PATCH /api/notifications/:id/read` | Phase 3 |
| **Community Feed: Reflections** | `app/(tabs)/community.tsx`<br>`stores/community.store.ts` | Array `INITIAL_FELLOWSHIP_POSTS`: `post-1`, `post-2`, `post-3`. In-memory likes/reposts/bookmarks. | `GET /api/posts/feed`<br>`POST /api/posts/:id/like`<br>`POST /api/posts/:id/repost`<br>`POST /api/posts/:id/bookmark` | Phase 1 |
| **Post Details & Comments** | `app/community/[id].tsx`<br>`stores/community.store.ts` | Array `comments: [c-1, c-2, c-3]`. Mutates local store only. | `GET /api/posts/:id`<br>`GET /api/posts/:id/comments`<br>`POST /api/posts/:id/comments` | Phase 1 |
| **Post Composer** | `app/community/compose.tsx` | Creates `post-${Date.now()}` and saves locally into Zustand. | `POST /api/posts` | Phase 1 |
| **Member Profile: Header & Stats** | `app/community/user/[id].tsx`<br>`stores/community.store.ts` | `INITIAL_MEMBERS`: `m1` ("Abenezer Bekele", 480 followers, 210 following, 16 posts, 32d streak, "4 Kilo Fellowship Hall", "@abenezer_worship", "September 2022"). | `GET /api/users/:id/profile`<br>`PATCH /api/users/me/profile` | Phase 1 |
| **Member Profile: Highlights** | `app/community/user/[id].tsx` | Static array `STORY_HIGHLIGHTS`: Sunday ⛪, Worship 🎸, Camp '25 ⛺, Outreach 🌱, Testimony ✨. | `GET /api/users/:id/highlights` | Phase 2 |
| **Member Profile: Ministry & Schedule** | `app/community/user/[id].tsx` | Static JSX for fellowship ministries & weekly schedules. | `GET /api/users/:id/ministries` | Phase 2 |
| **Member Profile: Mutual Social Proof** | `app/community/user/[id].tsx` | Static `mutualFollowers` object (Hiwot, Bethelhem, Natnael, 28 others). | `GET /api/users/:id/mutuals` | Phase 1 |
| **Connections Screen** | `app/community/user/connections.tsx` | Filters local in-memory Zustand members. | `GET /api/users/:id/followers`<br>`GET /api/users/:id/following` | Phase 1 |
| **Community Search** | `app/community/search.tsx` | Static `TRENDING_TAGS` and local store filtering. | `GET /api/search/trending`<br>`GET /api/search` | Phase 2 |

---

## 3. Critical Risks & Stop Conditions

1. **STOP CONDITION: Relational Social Graph vs. MongoDB Core**
   - *Issue:* The user accounts and fellowship entities live in MongoDB Atlas, while the social graph (follows, feeds, reposts, multi-level counters, relational integrity) requires relational ACID and index-backed join performance.
   - *Resolution:* ADR 0001 establishes PostgreSQL via Prisma 7 as the single source of truth for all social domain data (`Post`, `Comment`, `Like`, `Repost`, `Bookmark`, `Follow`, `Highlight`, `Streak`). Reference user identities across the boundary via indexed `userId: String` (identical to the existing `Order.userId` pattern).
2. **Authentication User ID Consistency:**
   - Both MongoDB `_id` (hex string) and Better Auth `user.id` resolve to strings. The social tables use string `userId` for author and viewer keys.
3. **Observability & Error Handling:**
   - Need standard RFC 9457 error format and Pino logger with request ID before high-volume social endpoints open.

---

## 4. Phase Delivery Plan & Gates

```
Phase 0 (Audit & Decisions) ──► Phase 1 (Core Social & Follow Graph) ──► Phase 2 (Media, Highlights & Search) ──► Phase 3 (Streaks, Push & E2E)
```

- **Phase 0:** Complete audit, ADRs 0001, 0002, 0003.
- **Phase 1 (Gate 1):** Prisma social migrations + Core feed/follow/post endpoints + Mobile community feed & profile wiring.
- **Phase 2 (Gate 2):** Media upload pipeline (Cloudinary/S3) + Story Highlights + Full-text search.
- **Phase 3 (Gate 3):** Server-validated streaks + In-app and push notifications + E2E test verification.
