import { registerAs } from '@nestjs/config'

const parseTrustProxyHops = (): number | null => {
  const v = process.env.TRUST_PROXY?.trim()
  if (!v) {
    return null
  }
  if (v === 'false' || v === '0') {
    return null
  }
  if (v === 'true') {
    return 1
  }
  const n = parseInt(v, 10)
  if (Number.isFinite(n) && n > 0) {
    return n
  }
  return null
}

export type AppConfig = {
  port: number
  nodeEnv: string
  /** Number of trusted reverse proxies (Express `trust proxy`). `null` = leave Express default. */
  http: {
    trustProxyHops: number | null
  }
  /** Set `REDIS_URL` to use Redis for auth rate-limit storage across multiple API instances. */
  redis: {
    url: string | null
  }
  database: {
    host: string
    port: number
    user: string
    password: string
    name: string
  }
  jwt: {
    accessSecret: string
    accessExpiresIn: string
    refreshExpiresIn: string
  }
  invites: {
    /** When false, API does not return raw token; prod default is false */
    exposeTokenInApi: boolean
    /** Pending invite lifetime */
    ttlMs: number
  }
  events: {
    /** Idempotency key reuse window for POST /v1/events (hours) */
    idempotencyTtlHours: number
    /** When true, event properties are validated against event schemas (strict in prod by default). */
    schemaEnforce: boolean
  }
  jobs: {
    /** Whether to enable BullMQ workers inside this process (requires REDIS_URL). */
    enableWorkers: boolean
  }
}

const parseInviteExposeToken = (): boolean => {
  const raw = process.env.WORKSPACE_INVITE_EXPOSE_TOKEN
  if (raw === 'true') {
    return true
  }
  if (raw === 'false') {
    return false
  }
  return (process.env.NODE_ENV ?? 'development') !== 'production'
}

const parseInviteTtlMs = (): number => {
  const hoursRaw = process.env.WORKSPACE_INVITE_TTL_HOURS
  if (hoursRaw !== undefined && hoursRaw !== '') {
    const hours = parseFloat(hoursRaw)
    if (!Number.isFinite(hours) || hours <= 0) {
      return 7 * 24 * 60 * 60 * 1000
    }
    return Math.round(hours * 60 * 60 * 1000)
  }
  return 7 * 24 * 60 * 60 * 1000
}

const parseEventsIdempotencyTtlHours = (): number => {
  const raw = process.env.EVENT_IDEMPOTENCY_TTL_HOURS
  if (raw === undefined || raw.trim() === '') {
    return 72
  }
  const n = parseFloat(raw)
  if (!Number.isFinite(n) || n <= 0) {
    return 72
  }
  return Math.round(n * 10) / 10
}

const parseEventSchemaEnforce = (): boolean => {
  const raw = process.env.EVENT_SCHEMA_ENFORCE?.trim()
  if (raw === 'true') {
    return true
  }
  if (raw === 'false') {
    return false
  }
  return (process.env.NODE_ENV ?? 'development') === 'production'
}

const parseJobsEnableWorkers = (): boolean => {
  const raw = process.env.JOBS_ENABLE_WORKERS?.trim()
  if (raw === 'true') {
    return true
  }
  if (raw === 'false') {
    return false
  }
  return (process.env.NODE_ENV ?? 'development') !== 'test'
}

export const configuration = registerAs(
  'app',
  (): AppConfig => ({
    port: parseInt(process.env.PORT ?? '3000', 10),
    nodeEnv: process.env.NODE_ENV ?? 'development',
    http: {
      trustProxyHops: parseTrustProxyHops(),
    },
    redis: {
      url: process.env.REDIS_URL?.trim() || null,
    },
    database: {
      host: process.env.DATABASE_HOST ?? 'localhost',
      port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
      user: process.env.DATABASE_USER ?? 'postgres',
      password: process.env.DATABASE_PASSWORD ?? 'postgres',
      name: process.env.DATABASE_NAME ?? 'analytics',
    },
    jwt: {
      accessSecret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret-change-me',
      accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
    },
    invites: {
      exposeTokenInApi: parseInviteExposeToken(),
      ttlMs: parseInviteTtlMs(),
    },
    events: {
      idempotencyTtlHours: parseEventsIdempotencyTtlHours(),
      schemaEnforce: parseEventSchemaEnforce(),
    },
    jobs: {
      enableWorkers: parseJobsEnableWorkers(),
    },
  }),
)
