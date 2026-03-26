import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Queue, Worker, type JobsOptions } from 'bullmq'
import { DataSource } from 'typeorm'
import type { Redis } from 'ioredis'
import type { AppConfig } from '../../shared/config/configuration'
import {
  AGG_JOB_DAILY_AGGREGATES,
  CLEANUP_JOB_EXPIRED_IDEMPOTENCY_KEYS,
  QUEUE_AGGREGATION,
  QUEUE_CLEANUP,
} from './jobs.constants'
import { createRedisConnection } from './redis.connection'
import { ExpiredIdempotencyKeysCleanupProcessor } from './cleanup/expired-idempotency-keys.processor'

@Injectable()
export class JobsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(JobsService.name)

  private connection: Redis | null = null
  private cleanupQueue: Queue | null = null
  private cleanupWorker: Worker | null = null
  private aggregationQueue: Queue | null = null
  private aggregationWorker: Worker | null = null

  constructor(
    private readonly config: ConfigService,
    private readonly cleanup: ExpiredIdempotencyKeysCleanupProcessor,
    private readonly dataSource: DataSource,
  ) {}

  async onModuleInit(): Promise<void> {
    const redisUrl = this.config.get<AppConfig['redis']['url']>('app.redis.url', { infer: true })
    if (!redisUrl) {
      this.logger.log('jobs.disabled reason=REDIS_URL_not_configured')
      return
    }

    const enableWorkers =
      this.config.get<AppConfig['jobs']['enableWorkers']>('app.jobs.enableWorkers', { infer: true }) ?? true
    if (!enableWorkers) {
      this.logger.log('jobs.disabled reason=JOBS_ENABLE_WORKERS_false')
      return
    }

    this.connection = createRedisConnection(redisUrl)
    this.cleanupQueue = new Queue(QUEUE_CLEANUP, { connection: this.connection })
    this.aggregationQueue = new Queue(QUEUE_AGGREGATION, { connection: this.connection })

    const opts: JobsOptions = {
      attempts: 5,
      backoff: { type: 'exponential', delay: 2000 },
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 1000 },
      // Run every 5 minutes
      repeat: { every: 5 * 60 * 1000 },
    }

    // Idempotent: BullMQ de-dupes repeatable jobs by name + repeat options.
    await this.cleanupQueue.add(
      CLEANUP_JOB_EXPIRED_IDEMPOTENCY_KEYS,
      { batchSize: 2000 },
      opts,
    )

    // Daily aggregates: run once per day. Keep it simple: aggregate "yesterday" in UTC.
    await this.aggregationQueue.add(
      AGG_JOB_DAILY_AGGREGATES,
      { dayOffsetUtc: 1 },
      {
        attempts: 5,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 1000 },
        repeat: { every: 24 * 60 * 60 * 1000 },
      },
    )

    this.cleanupWorker = new Worker(
      QUEUE_CLEANUP,
      async (job) => {
        if (job.name === CLEANUP_JOB_EXPIRED_IDEMPOTENCY_KEYS) {
          return this.cleanup.run({ batchSize: job.data?.batchSize ?? 2000 })
        }
        return { ignored: true }
      },
      {
        connection: this.connection,
        concurrency: 1,
      },
    )

    this.aggregationWorker = new Worker(
      QUEUE_AGGREGATION,
      async (job) => {
        if (job.name !== AGG_JOB_DAILY_AGGREGATES) {
          return { ignored: true }
        }

        const dayOffsetUtc = Math.max(0, Math.min(job.data?.dayOffsetUtc ?? 1, 30))
        const now = new Date()
        const target = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
        target.setUTCDate(target.getUTCDate() - dayOffsetUtc)
        const dayStart = new Date(target)
        const dayEnd = new Date(target)
        dayEnd.setUTCDate(dayEnd.getUTCDate() + 1)
        const dayStr = dayStart.toISOString().slice(0, 10)

        const startedAt = Date.now()
        // Aggregate counts + uniqueUsers (based on properties.userId if present)
        await this.dataSource.query(
          `
          INSERT INTO daily_event_aggregates (workspace_id, date, event_name, count, unique_users, created_at, updated_at)
          SELECT
            e.workspace_id AS workspace_id,
            $1::date AS date,
            e.event_name AS event_name,
            COUNT(*)::int AS count,
            COUNT(DISTINCT NULLIF(e.properties->>'userId', ''))::int AS unique_users,
            now() AS created_at,
            now() AS updated_at
          FROM events e
          WHERE e.timestamp >= $2
            AND e.timestamp < $3
          GROUP BY e.workspace_id, e.event_name
          ON CONFLICT (workspace_id, date, event_name)
          DO UPDATE SET
            count = EXCLUDED.count,
            unique_users = EXCLUDED.unique_users,
            updated_at = now()
          `,
          [dayStr, dayStart.toISOString(), dayEnd.toISOString()],
        )

        this.logger.log(
          `jobs.aggregation.daily_aggregates success date=${dayStr} durationMs=${Date.now() - startedAt}`,
        )
        return { date: dayStr }
      },
      { connection: this.connection, concurrency: 1 },
    )

    this.cleanupWorker.on('failed', (job, err) => {
      this.logger.error(
        `jobs.failed queue=${QUEUE_CLEANUP} job=${job?.name ?? 'unknown'} id=${job?.id ?? 'unknown'} error=${err?.message ?? 'unknown'}`,
      )
    })

    this.cleanupWorker.on('completed', (job) => {
      this.logger.debug(`jobs.completed queue=${QUEUE_CLEANUP} job=${job.name} id=${job.id}`)
    })

    this.aggregationWorker.on('failed', (job, err) => {
      this.logger.error(
        `jobs.failed queue=${QUEUE_AGGREGATION} job=${job?.name ?? 'unknown'} id=${job?.id ?? 'unknown'} error=${err?.message ?? 'unknown'}`,
      )
    })

    this.aggregationWorker.on('completed', (job) => {
      this.logger.debug(`jobs.completed queue=${QUEUE_AGGREGATION} job=${job.name} id=${job.id}`)
    })

    this.logger.log('jobs.enabled queues=cleanup,aggregation')
  }

  async onModuleDestroy(): Promise<void> {
    await this.cleanupWorker?.close()
    await this.cleanupQueue?.close()
    await this.aggregationWorker?.close()
    await this.aggregationQueue?.close()
    await this.connection?.quit()
  }
}

