PHASE 1 — FOUNDATION (PRODUCTION BUILD ORDER)

STEP 1 — Core project foundation

Setup:
- NestJS backend
- NextJS dashboard
- PostgreSQL
- Docker
- Environment config
- Config module
- Base folder architecture (modules / shared / workers)

Result:
Clean project structure ready.


STEP 2 — Identity layer (Auth + Users)

Build:
- User entity
- Registration
- Login
- Password hashing
- JWT authentication
- Auth guards
- DTO validation
- Standard API response format
- Refresh tokens

Result:
Users can authenticate safely.


STEP 3 — Multi-tenancy foundation (Workspaces)

Build:
- Workspace entity
- Workspace membership entity
- Invite users
- Workspace switching
- Roles:
  owner
  admin
  member

Add:
- Workspace guard
- Workspace middleware resolver

Rules:
Workspace must come from auth context.
Never trust workspaceId from request body.

Result:
Secure tenant boundary exists.


STEP 4 — API key system

Build:
API Key entity:

id
workspaceId
keyHash
name
permissions
createdAt
lastUsedAt

Build:
- API key generator
- Key hashing
- API key guard
- Workspace lookup from API key

Rules:
Never store raw API keys.
Store hashes only.

Each API key must belong to a default datasource.
Events must resolve sourceId server-side from API key → datasource mapping.
Clients must never send sourceId.

Result:
Secure ingestion entry point.


STEP 5 — Event ingestion contract

Define event format:

{
  eventName
  properties
  timestamp
}

Headers:

x-api-key
x-idempotency-key

Validation:

Required:
eventName

Optional:
timestamp

Limits:

Max events per request: 1000
Max payload: 1MB

Result:
Stable ingestion contract.


STEP 6 — Event storage design

Event entity:

id
workspaceId
sourceId
eventName
timestamp
idempotencyKey
properties (JSONB)
createdAt

Indexes:

INDEX (workspaceId, timestamp)
INDEX (workspaceId, eventName)
UNIQUE (workspaceId, idempotencyKey)

Rules:

Events are append only.
Never update events.

Idempotency keys may expire after a defined window (example: 24–72 hours).
Old keys may be cleaned by a background job.

Reason:
Prevents unbounded index growth. Most systems only guarantee idempotency for a retry window, not forever.

Result:
Scalable data foundation.


STEP 7 — Event ingestion implementation

Build:

POST /v1/events

Features:

Bulk ingestion
Validation
Deduplication
Workspace resolution from API key
Batch insert
Retry safety

Workspace and sourceId must be resolved from API key.
Never accept these values from request body.

Result:
Production ingestion pipeline.


STEP 8 — Event schema registry

Create:

events/schema/

Example:

user_signup.schema.ts
api_request.schema.ts
subscription_created.schema.ts

Schema defines:

eventName
required fields
optional fields
property types

Validation checks schema.

Result:
Stable analytics foundation.


STEP 9 — Background job system

Setup:

Redis
BullMQ
Worker module

Workers:

aggregation worker
cleanup worker

Add:

Retry rules
Failure logging
Job monitoring

Result:
Processing layer ready.


STEP 10 — Basic aggregation engine

Create daily aggregates table:

workspaceId
date
eventName
count
uniqueUsers

Worker computes:

Daily counts
Active users
Growth metrics

Schedule:

Daily aggregation job.

Result:
Fast metrics queries.


STEP 11 — Metrics query layer

Build metrics service:

Queries:

Total events
Active users
Growth rate
Daily usage

Rules:

Query aggregates not raw events.

Add:

Pagination
Query limits

Result:
Safe metrics queries.


STEP 12 — Dashboard API

Endpoints:

GET /v1/metrics/events
GET /v1/metrics/active-users
GET /v1/metrics/growth
GET /v1/metrics/daily

Add:

Workspace filtering
Rate limiting
Optional caching

Result:
Metrics accessible to frontend.


STEP 13 — Observability and stability layer

Add:

Request logging
Error logging
Correlation IDs

Health endpoints:

GET /health
GET /health/ready
GET /health/live

Track:

Request duration
Error counts

Result:
System is diagnosable.


STEP 14 — Basic dashboard UI

Show only:

Total events
Active users
Growth chart
Daily activity chart

Avoid:

Customization
Complex dashboards
Filters

Result:
Usable product exists.


STEP 15 — First connector (Postgres)

Build datasource entity:

id
workspaceId
type
config
status
lastSync

Connector features:

Connection test
Sample query
Sync job

Result:
External data integration works.


STEP 16 — Cost protection layer

Add:

Event limits per workspace
Query row limits
Payload limits
Rate limits

Monitor:

Event volume
Storage growth

Result:
Costs controlled early.


STEP 17 — Developer access layer

Add:

Swagger docs
API examples
SDK (optional)
API key dashboard

Result:
Developers can integrate.


STEP 18 — Deployment

Deploy:

Backend
Frontend
Database

Add:

Secrets management
Basic monitoring
Backups

Result:
First beta version live.