# Frontend story (dashboard flow)

This document describes the **current dashboard UX** (Phase 1). It’s intentionally minimal but “real SaaS” styled.

## What the user can do

- Create an account (register)
- Log in
- Pick a workspace (auto-selected on login if available)
- Pick a date range
- View 4 dashboard outputs:
  - total events
  - active users
  - growth
  - daily activity chart
- Manage developer access (API keys)
- Manage workspaces (members, invites, rename, leave, transfer ownership)

## Where it lives

- App: `dashboard/` (Next.js)
- Main page: `dashboard/app/page.tsx`

## 1) Register / Login

On first visit, the user sees an auth panel:
- **Register**: calls `POST /v1/auth/register`
- **Login**: calls `POST /v1/auth/login`

On success, the UI stores:
- `accessToken` (localStorage key: `analytics_saas_access_token`)
- `refreshToken` (localStorage key: `analytics_saas_refresh_token`)

## 2) Workspace selection

After login:
1. UI automatically calls `GET /v1/workspaces` with `Authorization: Bearer <accessToken>`
2. UI shows a dropdown of workspaces and stores:
   - selected workspace id (localStorage key: `analytics_saas_workspace_id`)

That selected workspace is sent on all metrics calls as:
- `x-workspace-id: <uuid>`

Notes:
- If there is no saved workspace id, the UI selects the **first** workspace returned (if any)

## 3) Date range

User selects:
- `fromDate` (YYYY-MM-DD)
- `toDate` (YYYY-MM-DD)

These map directly to the backend query params.

## 4) Metrics queries (Dashboard API)

When the user clicks **Refresh**, the UI fetches (in parallel):

- `GET /v1/metrics/events?fromDate=...&toDate=...`
- `GET /v1/metrics/active-users?fromDate=...&toDate=...`
- `GET /v1/metrics/growth?fromDate=...&toDate=...`
- `GET /v1/metrics/daily?fromDate=...&toDate=...&limit=60&offset=0`

Headers:
- `Authorization: Bearer <accessToken>`
- `x-workspace-id: <workspaceId>`

## 5) Token refresh behavior

If a metrics request fails due to auth, the UI tries:
- `POST /v1/auth/refresh` with `{ refreshToken }`

Then retries the metrics request using the new access token.

## 6) UI components (current)

- Sidebar navigation: `dashboard/components/Sidebar.tsx`
- KPI cards: `dashboard/components/MetricCard.tsx`
- Daily chart: `dashboard/components/AreaChart.tsx`

## 7) Workspace management (members + invites + settings)

When the user opens the **Workspace** view in the sidebar, the UI calls (workspace-scoped):

- Members:
  - `GET /v1/workspaces/members`
  - `PATCH /v1/workspaces/members/:userId` body `{ role }`
  - `DELETE /v1/workspaces/members/:userId`

- Invites:
  - `GET /v1/workspaces/invites`
  - `POST /v1/workspaces/invites` body `{ email, role }`
  - `DELETE /v1/workspaces/invites/:inviteId`

- Settings:
  - `PATCH /v1/workspaces` body `{ name }`
  - `POST /v1/workspaces/leave`
  - `POST /v1/workspaces/ownership/transfer` body `{ newOwnerUserId }`

Note on invite tokens:
- In production the backend may **not** return the raw invite token in JSON.
- In dev, when configured to expose tokens, the UI can show it once.

## 8) API key management (developer access)

When the user opens the **API keys** view, the UI calls (workspace-scoped):

- `GET /v1/workspaces/api-keys`
- `POST /v1/workspaces/api-keys`
- `DELETE /v1/workspaces/api-keys/:apiKeyId`

## Known limitations (by design for Step 14)

- No multi-page routing yet (single screen)
- No role-based UI differences yet (owner/admin/member)
- “Active users” depends on ingestion including `properties.userId`
- No caching yet (every refresh hits the API)

