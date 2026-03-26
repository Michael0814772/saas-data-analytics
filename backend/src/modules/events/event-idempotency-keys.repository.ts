import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, MoreThan, Repository } from 'typeorm'
import type { EntityManager } from 'typeorm'
import { EventIdempotencyKey } from './entities/event-idempotency-key.entity'

@Injectable()
export class EventIdempotencyKeysRepository {
  private readonly logger = new Logger(EventIdempotencyKeysRepository.name)

  constructor(
    @InjectRepository(EventIdempotencyKey)
    private readonly repo: Repository<EventIdempotencyKey>,
  ) {}

  async findActiveByKeys(params: {
    manager?: EntityManager
    workspaceId: string
    idempotencyKeys: string[]
    now: Date
  }): Promise<Set<string>> {
    if (params.idempotencyKeys.length === 0) {
      return new Set()
    }
    const target = params.manager?.getRepository(EventIdempotencyKey) ?? this.repo
    this.logger.debug(
      `events.idempotency.findActive workspaceId=${params.workspaceId} keys=${params.idempotencyKeys.length}`,
    )
    const rows = await target.find({
      where: {
        workspaceId: params.workspaceId,
        idempotencyKey: In(params.idempotencyKeys),
        expiresAt: MoreThan(params.now),
      },
      select: ['idempotencyKey'],
    })
    return new Set(rows.map((r) => r.idempotencyKey))
  }

  /**
   * Upsert idempotency keys for a new ingestion attempt.
   * - Active keys (not expired) will remain with their existing expiresAt.
   * - Expired or missing keys will have expiresAt refreshed to the new expiry window.
   */
  async upsertKeys(params: {
    manager: EntityManager
    workspaceId: string
    idempotencyKeys: string[]
    expiresAt: Date
  }): Promise<void> {
    if (params.idempotencyKeys.length === 0) {
      return
    }

    // We intentionally avoid ON CONFLICT here.
    // In some dev/test DBs, the unique index might not be present yet (migration
    // ordering / partially created tables). UPDATE + INSERT is safe for our
    // expiry-based dedupe: we only insert events after we refresh/record keys.
    //
    // 1) Refresh expires_at for any existing rows.
    await params.manager.query(
      `
      UPDATE event_idempotency_keys
      SET expires_at = $1
      WHERE workspace_id = $2
        AND idempotency_key = ANY($3::text[])
      `,
      [params.expiresAt.toISOString(), params.workspaceId, params.idempotencyKeys],
    )

    // 2) Insert rows for keys that do not exist.
    await params.manager.query(
      `
      INSERT INTO event_idempotency_keys (workspace_id, idempotency_key, expires_at, created_at)
      SELECT
        $2 AS workspace_id,
        key AS idempotency_key,
        $1 AS expires_at,
        now() AS created_at
      FROM unnest($3::text[]) AS key
      WHERE NOT EXISTS (
        SELECT 1
        FROM event_idempotency_keys e
        WHERE e.workspace_id = $2
          AND e.idempotency_key = key
      )
      `,
      [params.expiresAt.toISOString(), params.workspaceId, params.idempotencyKeys],
    )
  }

  /**
   * Atomically "claims" idempotency keys for insertion.
   *
   * When the unique index on (workspace_id, idempotency_key) exists, we use:
   * - INSERT for missing rows
   * - UPDATE expires_at only when the key is expired
   * - RETURNING keys that were inserted/updated (i.e. should create events)
   *
   * If ON CONFLICT cannot run (unique index missing), we fall back to:
   * - read active keys (expires_at > now)
   * - refresh/insert missing keys via UPDATE+INSERT
   */
  async claimKeys(params: {
    manager: EntityManager
    workspaceId: string
    idempotencyKeys: string[]
    expiresAt: Date
    now: Date
  }): Promise<Set<string>> {
    if (params.idempotencyKeys.length === 0) {
      return new Set()
    }

    const hasUniqueIndex = await params.manager
      .query(
        `
        SELECT 1
        FROM pg_indexes
        WHERE schemaname = 'public'
          AND tablename = 'event_idempotency_keys'
          AND indexdef ILIKE 'CREATE UNIQUE INDEX%'
          AND indexdef ILIKE '%workspace_id%'
          AND indexdef ILIKE '%idempotency_key%'
        LIMIT 1
        `,
      )
      .then((rows: Array<Record<string, unknown>>) => rows.length > 0)

    if (!hasUniqueIndex) {
      const active = await this.findActiveByKeys({
        manager: params.manager,
        workspaceId: params.workspaceId,
        idempotencyKeys: params.idempotencyKeys,
        now: params.now,
      })
      const missing = params.idempotencyKeys.filter((k) => !active.has(k))
      await this.upsertKeys({
        manager: params.manager,
        workspaceId: params.workspaceId,
        idempotencyKeys: missing,
        expiresAt: params.expiresAt,
      })
      return new Set(missing)
    }

    const rows = (await params.manager.query(
      `
      INSERT INTO event_idempotency_keys (workspace_id, idempotency_key, expires_at, created_at)
      SELECT
        $1 AS workspace_id,
        key AS idempotency_key,
        $2 AS expires_at,
        now() AS created_at
      FROM unnest($3::text[]) AS key
      ON CONFLICT (workspace_id, idempotency_key)
      DO UPDATE SET expires_at = EXCLUDED.expires_at
      WHERE event_idempotency_keys.expires_at <= $4
      RETURNING idempotency_key
      `,
      [params.workspaceId, params.expiresAt.toISOString(), params.idempotencyKeys, params.now.toISOString()],
    )) as Array<{ idempotency_key: string }>

    return new Set(rows.map((r) => r.idempotency_key))
  }
}

