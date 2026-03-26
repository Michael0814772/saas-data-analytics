# Backend user story (flow)

This document describes the **end-to-end backend flow** for Phase 1: identity → tenancy → ingestion → aggregates → metrics.

## Actors

- **End user**: signs up, logs in, views dashboards
- **API client / SDK**: sends events using an **API key**
- **Workers**: background jobs for cleanup + aggregation

## 1) Sign up (Identity + default workspace)

1. User calls `POST /v1/auth/register` with `{ email, password }`.
2. Backend:
   - creates the `users` row
   - creates a **default workspace** (name: `My workspace`)
   - creates a membership with role **owner**
   - returns `{ accessToken, refreshToken, user, accessExpiresIn }`

Notes:
- Auth endpoints are rate-limited.
- Responses use the standard shape:
  - success: `{ "success": true, "data": ... }`
  - error: `{ "success": false, "error": "<CODE>", "message": "<text>" }`

## 2) Login + token lifecycle

- `POST /v1/auth/login` returns a new access+refresh token pair.
- `POST /v1/auth/refresh` rotates refresh tokens and returns a new pair.
- `POST /v1/auth/logout` revokes a refresh token **only if it belongs to the caller**.
- `GET /v1/auth/me` returns the current user.

## 3) Multi-tenancy (Workspaces)

All business data is scoped to a workspace.

- List your workspaces: `GET /v1/workspaces` (JWT)
- Workspace-scoped routes require header:
  - `x-workspace-id: <uuid>`

Workspace guard rules:
- missing header → `400 WORKSPACE_REQUIRED`
- invalid UUID → `400 INVALID_WORKSPACE_ID`
- not a member → `403 WORKSPACE_FORBIDDEN`

Workspace management endpoints (owner/admin unless noted):
- **Workspace context** (any member): `GET /v1/workspaces/context`
- **Rename workspace**: `PATCH /v1/workspaces` body `{ name }`
- **List members** (any member): `GET /v1/workspaces/members`
- **Change member role**: `PATCH /v1/workspaces/members/:userId` body `{ role }`
- **Remove member**: `DELETE /v1/workspaces/members/:userId`
- **Create invite**: `POST /v1/workspaces/invites` body `{ email, role }`
- **List pending invites**: `GET /v1/workspaces/invites`
- **Revoke invite**: `DELETE /v1/workspaces/invites/:inviteId`
- **Leave workspace** (self): `POST /v1/workspaces/leave`
- **Transfer ownership** (owner only): `POST /v1/workspaces/ownership/transfer` body `{ newOwnerUserId }`

Member lifecycle rules (enforced in service):
- **Last owner protection**: workspace must keep at least 1 owner (cannot demote/remove sole owner; owner must transfer before leaving)
- **Admin restrictions**: admin cannot modify/remove owners; only owner can assign owner role

## 4) Create an API key (for ingestion)

1. User (owner/admin) calls `POST /v1/workspaces/api-keys` with:
   - `x-workspace-id: <uuid>`
   - body: `{ name, sourceId, permissions: ["events:ingest"] }`
2. Backend returns the raw key **once**.

Important:
- API keys are stored as **hashes only**.
- Ingestion requires permission: **`events:ingest`**.

## 5) Ingest events (append-only)

Endpoint: `POST /v1/events`

Headers:
- `x-api-key: <raw_key>`
- `x-idempotency-key: <string>`

Body:
- single event, array of events, or `{ events: [...] }`

Backend behavior:
- resolves `workspaceId` + `sourceId` from `x-api-key`
  - **never** accepts these values from the request body
- validates payload limits:
  - max events: 1000
  - max payload: 1MB
- validates event format:
  - `eventName` required
  - `properties` object (defaults to `{}`)
  - `timestamp` optional (defaults to now)
- applies idempotency + dedupe:
  - uses a **72h** (configurable) idempotency window
  - tracks keys in `event_idempotency_keys` with `expires_at`
- inserts new rows into `events` (append-only)

Schema registry (Step 8):
- if `EVENT_SCHEMA_ENFORCE=true`, `eventName` must exist in the registry and required/optional property types are validated.

## 6) Background jobs (Step 9)

When `REDIS_URL` is configured, BullMQ runs:

- **Cleanup job**: deletes expired rows from `event_idempotency_keys` in batches.
- **Aggregation job** (Step 10): computes daily aggregates for yesterday (UTC).

Notes:
- `JOBS_ENABLE_WORKERS=false` can disable workers inside the API process (useful when splitting into a separate worker service later).

## 7) Aggregation table (Step 10)

Worker writes to:
- `daily_event_aggregates(workspace_id, date, event_name, count, unique_users)`

Unique users:
- computed using `properties.userId` when present
- if your events don’t include `properties.userId`, `unique_users` will trend toward 0

## 8) Metrics query layer + Dashboard API (Steps 11–12)

Metrics queries read **only** from `daily_event_aggregates` (not raw `events`):

- `GET /v1/metrics/events`
- `GET /v1/metrics/active-users`
- `GET /v1/metrics/growth`
- `GET /v1/metrics/daily`

All metrics endpoints require:
- `Authorization: Bearer <accessToken>`
- `x-workspace-id: <uuid>`

## 9) Observability (Step 13)

Health endpoints:
- `GET /v1/health` (simple)
- `GET /v1/health/live` (liveness)
- `GET /v1/health/ready` (readiness: checks DB, and Redis if configured)

Logging:
- structured logs with `requestId` + `correlationId`
- consistent error formatting via the global exception filter

