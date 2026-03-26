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
| `x-api-key: <raw_api_key>` | Used by API-key-protected ingestion endpoints (via `ApiKeyGuard`) |
| `x-idempotency-key: <string>` | Required for event ingestion (`POST /v1/events`) to make retries safe |

Do **not** send `workspaceId` in JSON bodies for tenancy; use **`x-workspace-id`** only.

### Workspace invite env (backend)

| Variable | Purpose |
|----------|---------|
| `WORKSPACE_INVITE_EXPOSE_TOKEN` | `true` / `false`. If unset, **`false` when `NODE_ENV=production`**, otherwise **`true`** (dev gets `token` in create-invite response). |
| `WORKSPACE_INVITE_TTL_HOURS` | Pending invite lifetime in hours (default **168** = 7 days). |

When the token is **not** returned from the API, the server **logs** in non-production (includes token for local testing). In **production** it logs metadata only — wire email or another channel next.

### Production HTTP / scaling (backend)

| Variable | Purpose |
|----------|---------|
| `TRUST_PROXY` | `1`, `2`, … or `true` (treated as **1**). Sets Express **trust proxy** so `req.ip` reflects the client when behind nginx/ALB. Omit or `false` / `0` to disable. |
| `REDIS_URL` | If set (e.g. `redis://redis:6379`), **auth rate limits** use Redis storage so limits are shared across **multiple API instances**. If unset, throttling stays **in-memory** (per process). |

### Event ingestion idempotency (backend)

| Variable | Purpose |
|----------|---------|
| `EVENT_IDEMPOTENCY_TTL_HOURS` | How long a given `x-idempotency-key` + event payload is treated as already-processed (default **72** hours). After expiry, the same key can be reused. |

### Cost protection (backend)

| Variable | Purpose |
|----------|---------|
| `COST_MAX_EVENTS_PER_WORKSPACE_PER_DAY` | Daily workspace event insert limit (UTC day). When exceeded, ingestion returns **429** with `error: EVENT_LIMIT_EXCEEDED`. |

### Event schema registry (backend)

| Variable | Purpose |
|----------|---------|
| `EVENT_SCHEMA_ENFORCE` | When `true`, `POST /v1/events` requires a registered schema for `eventName` and validates `properties` types/required fields. Default: `true` in production, `false` otherwise. |

---

## AppController

Root-level app and health checks. **Public** (no JWT).

| Method | Path | Body | What it does |
|--------|------|------|----------------|
| `GET` | `/v1` | — | Returns a hello payload (`data.message`). |
| `GET` | `/v1/health` | — | Simple health check; returns `{ "status": "ok" }` in `data`. |
| `GET` | `/v1/health/live` | — | **Liveness** probe (process up; no dependency checks). |
| `GET` | `/v1/health/ready` | — | **Readiness** probe (checks DB, and Redis if configured). |
| `GET` | `/v1/docs` | — | Swagger UI (enabled when `SWAGGER_ENABLED=true`, dev default). |

---

## AuthController

Base path: **`/v1/auth`**.  
Rate limits apply (per IP, rolling window): register and login are stricter; see `auth-throttle.constants.ts` / controller `@Throttle` values.

| Method | Path | Auth | Body (JSON) | What it does |
|--------|------|------|-------------|----------------|
| `POST` | `/v1/auth/register` | Public | `{ "email": string, "password": string }` — email valid email, max 320 chars; password 8–72 chars | Creates a user (email stored lowercase), hashes password, **creates a default workspace** (`My workspace`) with the user as **owner** (same DB transaction as signup), then returns `data.user`, access + refresh tokens, and `accessExpiresIn`. |
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
| `POST` | `/v1/workspaces/leave` | **Yes** | Any member | — | Removes **you** from the workspace. If you are the **only owner**, rejected (`LAST_OWNER`) — use **ownership transfer** first. |
| `POST` | `/v1/workspaces/ownership/transfer` | **Yes** | **Owner only** | `{ "newOwnerUserId": uuid }` | Makes another member an **owner** and **demotes you to admin** (atomic). Target must already be a member. Cannot transfer to yourself. |
| `PATCH` | `/v1/workspaces` | **Yes** | **Owner or admin** | `{ "name": string }` — 1–120 chars | Renames the workspace. |
| `POST` | `/v1/workspaces/invites` | **Yes** | **Owner or admin** | `{ "email": string, "role": "admin" \| "member" }` | Creates a pending invite. Returns `id`, `email`, `role`, `expiresAt`. **`token` is included only when** `WORKSPACE_INVITE_EXPOSE_TOKEN` / env defaults allow it (typically **dev**). Otherwise operators see logs (dev: token in logs) or must plug in email. |
| `GET` | `/v1/workspaces/invites` | **Yes** | **Owner or admin** | — | Lists **pending, non-expired** invites for the workspace. |
| `DELETE` | `/v1/workspaces/invites/:inviteId` | **Yes** | **Owner or admin** | — | Revokes a **pending** invite for this workspace. Unknown or already-used id → 404 `INVITE_NOT_FOUND`. |
| `GET` | `/v1/workspaces/members` | **Yes** | Any member | — | Lists members with `userId`, `email`, `role`, `joinedAt`. |
| `PATCH` | `/v1/workspaces/members/:userId` | **Yes** | **Owner or admin** | `{ "role": "owner" \| "admin" \| "member" }` | Updates a member’s role. **Only an owner** may assign `owner`. **Admins** cannot change or demote **owners**. Demoting/removing the **last owner** is rejected (`error: LAST_OWNER`, 400). Unknown `userId` → 404 `MEMBER_NOT_FOUND`. |
| `DELETE` | `/v1/workspaces/members/:userId` | **Yes** | **Owner or admin** | — | Removes a member from the workspace. Same owner/admin rules as PATCH; cannot remove the **last owner** (`LAST_OWNER`). |

---

## ApiKeysController

Base path: **`/v1/workspaces/api-keys`**.  
All routes require:
- `Authorization: Bearer <access_token>`
- `x-workspace-id: <uuid>`
- role **owner** or **admin** in that workspace

| Method | Path | Body (JSON) | What it does |
|--------|------|-------------|----------------|
| `POST` | `/v1/workspaces/api-keys` | `{ "name": string, "permissions"?: string[], "sourceId": string }` | Creates an API key. Returns raw `key` **once** (never stored raw), plus metadata (`id`, `keyPrefix`, `permissions`, `sourceId`, `createdAt`). |
| `GET` | `/v1/workspaces/api-keys` | — | Lists active API keys for workspace (no raw key), including `keyPrefix`, `permissions`, `sourceId`, `lastUsedAt`. |
| `DELETE` | `/v1/workspaces/api-keys/:apiKeyId` | — | Revokes one key in current workspace. |

Notes:
- API keys are stored as **hashes only** (`keyHash`).
- Each key is tied to a server-side `sourceId`; clients should not send source IDs during ingestion.
- `ApiKeyGuard` resolves workspace from `x-api-key` and updates `lastUsedAt`.

---

## DatasourcesController (Postgres connector)

Base path: **`/v1/workspaces/datasources`**.

All routes require:
- `Authorization: Bearer <access_token>`
- `x-workspace-id: <uuid>`
- caller must be a member of that workspace

| Method | Path | Body (JSON) | What it does |
|--------|------|-------------|---------------|
| `POST` | `/v1/workspaces/datasources` | `{ \"type\": \"postgres\", \"config\": { host, port, user, password, database, ssl? } }` | Creates a datasource record (connection test is separate). |
| `POST` | `/v1/workspaces/datasources/:id/test-connection` | — | Verifies the datasource can connect to Postgres and runs `SELECT 1`. Updates `status`. |
| `POST` | `/v1/workspaces/datasources/:id/sample-query` | — | Runs a small sample query (database/user/now). Updates `status` on failure. |
| `POST` | `/v1/workspaces/datasources/:id/sync` | — | Triggers a minimal Phase-1 sync (connection validation + `lastSync`). |

---

## Quick reference by controller

| Controller | Prefix | Purpose |
|------------|--------|---------|
| `AppController` | `/v1` | Smoke / health |
| `AuthController` | `/v1/auth` | Register, login, tokens, logout, current user |
| `WorkspacesController` | `/v1/workspaces` | Workspaces, invites, members, context (tenant via `x-workspace-id`) |
| `ApiKeysController` | `/v1/workspaces/api-keys` | API key lifecycle (create/list/revoke) |
| `MetricsController` | `/v1/metrics` | Dashboard metrics (reads aggregates only; tenant via `x-workspace-id`) |
| `DatasourcesController` | `/v1/workspaces/datasources` | Postgres connector config + tests + sync |

---

## Events ingestion

Endpoint: **`POST /v1/events`**

Headers:
- `x-api-key: <raw_api_key>` (resolves `workspaceId` + `sourceId` server-side)
- `x-idempotency-key: <string>` (retry safety)

Body (one of):
- Single event object: `{ \"eventName\": string, \"properties\": object, \"timestamp\"?: string }`
- Array of events: `[ { ... }, { ... } ]`
- Wrapped: `{ \"events\": [ { ... } ] }`

Validation + limits:
- `eventName` required (non-empty string)
- `properties` must be an object (default `{}` if omitted)
- `timestamp` optional (valid date string; default `now`)
- Max events per request: `1000`
- Max payload size: `1MB`

---

## Metrics (dashboard API)

Base path: **`/v1/metrics`**.

All routes require:
- `Authorization: Bearer <access_token>`
- `x-workspace-id: <uuid>`

Query params:
- `fromDate`: `YYYY-MM-DD`
- `toDate`: `YYYY-MM-DD`
- `eventName` (optional): filter to a single event

| Method | Path | What it does |
|--------|------|--------------|
| `GET` | `/v1/metrics/events` | Total events in range (from `daily_event_aggregates`). |
| `GET` | `/v1/metrics/active-users` | “Active users” in range, based on aggregated `uniqueUsers` (only meaningful if ingestion sets `properties.userId`). |
| `GET` | `/v1/metrics/growth` | Growth rate vs previous period of same length (based on total events). |
| `GET` | `/v1/metrics/daily` | Daily series; supports `limit` / `offset` pagination. |
