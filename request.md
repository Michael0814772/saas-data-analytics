# HTTP API requests

Backend base path: **`/v1`** (global prefix). Default server: `http://localhost:3000` (see `PORT` in `backend/.env`).

## Response shape

- **Success:** `{ "success": true, "data": { ... } }`
- **Error:** `{ "success": false, "error": "<code>", "message": "<text>" }`

## Auth headers

| Header | When |
|--------|------|
| `Authorization: Bearer <access_token>` | Required for all routes **except** those marked *Public* below |
| `x-workspace-id: <uuid>` | Required for workspace-scoped routes (see **WorkspacesController**) |

Do **not** send `workspaceId` in JSON bodies for tenancy; use **`x-workspace-id`** only.

---

## AppController

Root-level app and health checks. **Public** (no JWT).

| Method | Path | Body | What it does |
|--------|------|------|----------------|
| `GET` | `/v1` | — | Returns a hello payload (`data.message`). |
| `GET` | `/v1/health` | — | Liveness-style check; returns `{ "status": "ok" }` in `data`. |

---

## AuthController

Base path: **`/v1/auth`**.  
Rate limits apply (per IP, rolling window): register and login are stricter; see `auth-throttle.constants.ts` / controller `@Throttle` values.

| Method | Path | Auth | Body (JSON) | What it does |
|--------|------|------|-------------|----------------|
| `POST` | `/v1/auth/register` | Public | `{ "email": string, "password": string }` — email valid email, max 320 chars; password 8–72 chars | Creates a user (email stored lowercase), hashes password, returns `data.user`, access + refresh tokens, and `accessExpiresIn`. |
| `POST` | `/v1/auth/login` | Public | `{ "email": string, "password": string }` — password 1–72 chars | Validates credentials; returns same token shape as register. |
| `POST` | `/v1/auth/refresh` | Public | `{ "refreshToken": string }` — min 32 chars | Validates refresh token, **rotates** it (old refresh invalidated), returns new access + refresh tokens. |
| `POST` | `/v1/auth/logout` | JWT | `{ "refreshToken": string }` — min 32 chars | Requires access token. Revokes the given refresh token **only if** it belongs to the authenticated user. Returns `data.revoked: true`. |
| `GET` | `/v1/auth/me` | JWT | — | Returns current user profile (`id`, `email`, `createdAt`). |

---

## WorkspacesController

Base path: **`/v1/workspaces`**.  
All routes require **`Authorization: Bearer <access_token>`** unless noted.

Where **`x-workspace-id`** is required, the user must be a **member** of that workspace.  
**Owner/admin-only** routes also use `WorkspaceRolesGuard` (see table).

| Method | Path | `x-workspace-id` | Roles | Body (JSON) | What it does |
|--------|------|------------------|-------|-------------|----------------|
| `POST` | `/v1/workspaces` | No | — | `{ "name": string }` — 1–120 chars | Creates a workspace; caller becomes **owner**. Returns workspace id, name, role, `createdAt`. |
| `GET` | `/v1/workspaces` | No | — | — | Lists workspaces the current user belongs to, with role per workspace. |
| `POST` | `/v1/workspaces/invites/accept` | No | — | `{ "token": string }` — min 32 chars | Accepts an invite. JWT user’s **email** must match the invite. Adds membership (or idempotently completes invite if already a member). Returns workspace id/name, role, `alreadyMember`. |
| `GET` | `/v1/workspaces/context` | **Yes** | Any member | — | Returns active workspace summary: `id`, `name`, `role`, `createdAt` (from header workspace). |
| `PATCH` | `/v1/workspaces` | **Yes** | **Owner or admin** | `{ "name": string }` — 1–120 chars | Renames the workspace. |
| `POST` | `/v1/workspaces/invites` | **Yes** | **Owner or admin** | `{ "email": string, "role": "admin" \| "member" }` | Creates a pending invite. Returns invite metadata and a **one-time `token`** (store hashed server-side). Fails with conflict if user is already a member or a pending invite exists for that email. |
| `GET` | `/v1/workspaces/invites` | **Yes** | **Owner or admin** | — | Lists **pending, non-expired** invites for the workspace. |
| `GET` | `/v1/workspaces/members` | **Yes** | Any member | — | Lists members with `userId`, `email`, `role`, `joinedAt`. |

---

## Quick reference by controller

| Controller | Prefix | Purpose |
|------------|--------|---------|
| `AppController` | `/v1` | Smoke / health |
| `AuthController` | `/v1/auth` | Register, login, tokens, logout, current user |
| `WorkspacesController` | `/v1/workspaces` | Workspaces, invites, members, context (tenant via `x-workspace-id`) |
