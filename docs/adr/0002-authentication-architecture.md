# ADR 0002: Authentication Architecture & Session Verification

## Status
Accepted

## Context
The application serves Ethiopian university students and uses passwordless Ethiopian phone-only OTP via GeezSMS as its primary mobile entry point. The backend implements a hybrid authentication setup:
- **Better Auth** (`better-auth: 1.7.14`) configured with `expo()`, `bearer()`, and `phoneNumber()` plugins, backed by MongoDB.
- **Custom / Express Auth Endpoints** (`/api/auth/phone/send-otp`, `/api/auth/phone/verify-otp`, `/api/auth/signin`) that issue JWT tokens and upsert users.
- `auth.middleware.ts` inspects incoming `Authorization: Bearer <token>` and attempts validation via `auth.api.getSession()`, falling back to `verifyJwt(token)`.

## Decision
Retain this hybrid authentication architecture:
1. Social Platform endpoints will use the unified `requireAuth` middleware.
2. Authenticated user identity is accessed uniformly through `req.user.sub` (a string representation of the user ID).
3. Do not modify Better Auth core tables or internal authentication routes.
4. All social mutations (create post, like, follow, bookmark, comment) strictly require authentication and infer `authorId` / `followerId` from `req.user.sub`.

## Consequences
- Full backwards compatibility with all active mobile app clients.
- Seamless authentication across both Better Auth bearer sessions and custom JWT tokens.
- Secure, server-verified identity for all social platform actions.
