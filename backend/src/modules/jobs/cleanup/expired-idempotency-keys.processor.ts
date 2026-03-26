import { Injectable, Logger } from '@nestjs/common'
import { DataSource } from 'typeorm'

@Injectable()
export class ExpiredIdempotencyKeysCleanupProcessor {
  private readonly logger = new Logger(ExpiredIdempotencyKeysCleanupProcessor.name)

  constructor(private readonly dataSource: DataSource) {}

  /**
   * Deletes expired idempotency-key rows in small batches.
   * This keeps the Step 6 idempotency store bounded.
   */
  async run(params: { batchSize: number }): Promise<{ deleted: number }> {
    const startedAt = Date.now()
    const batchSize = Math.max(1, Math.min(params.batchSize, 10_000))

    // Use a CTE + LIMIT to avoid long locks.
    const res = (await this.dataSource.query(
      `
      WITH doomed AS (
        SELECT id
        FROM event_idempotency_keys
        WHERE expires_at <= now()
        ORDER BY expires_at ASC
        LIMIT $1
      )
      DELETE FROM event_idempotency_keys e
      USING doomed
      WHERE e.id = doomed.id
      RETURNING e.id
      `,
      [batchSize],
    )) as Array<{ id: string }>

    const deleted = res.length
    this.logger.log(`jobs.cleanup.idempotency_keys deleted=${deleted} durationMs=${Date.now() - startedAt}`)
    return { deleted }
  }
}

