import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { DataSource } from 'typeorm'
import { Request } from 'express'
import { ApiKeyContext } from './types/api-key-context.type'
import { EventsRepository } from './events.repository'
import { EventIdempotencyKeysRepository } from './event-idempotency-keys.repository'
import type { IngestEventInput } from './types/ingest-event-input.type'
import { createHash } from 'crypto'
import type { AppConfig } from '../../shared/config/configuration'

type IngestResult = {
  inserted: number
  deduped: number
}

const MAX_EVENT_NAME_LENGTH = 200
const STABLE_STRINGIFY_KEYS_LIMIT = 50_000

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name)

  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    private readonly events: EventsRepository,
    private readonly idempotencyKeys: EventIdempotencyKeysRepository,
  ) {}

  async ingestFromApiKey(params: {
    req: Request
    apiKeyContext: ApiKeyContext
    idempotencyKeyHeader: string
    inputEvents: IngestEventInput[]
  }): Promise<IngestResult> {
    const workspaceId = params.apiKeyContext.workspaceId
    const sourceId = params.apiKeyContext.sourceId
    const idempotencyBase = params.idempotencyKeyHeader.trim()

    if (!workspaceId || !sourceId) {
      throw new UnauthorizedException({
        error: 'API_KEY_CONTEXT_INVALID',
        message: 'API key context is missing',
      })
    }

    if (!Array.isArray(params.inputEvents) || params.inputEvents.length === 0) {
      throw new BadRequestException({ error: 'NO_EVENTS', message: 'No events provided' })
    }

    const withHashes = params.inputEvents.map((e) => {
      const normalizedTimestamp = e.timestamp
      const stableProperties = this.stableStringify(e.properties ?? {})
      // If the client omitted `timestamp`, use a stable hash input so retries dedupe.
      const timestampPart = e.timestampProvided ? normalizedTimestamp.toISOString() : ''
      const eventHash = this.hashString(`${e.eventName}:${timestampPart}:${stableProperties}`)
      const idempotencyKey = `${idempotencyBase}:${eventHash}`

      return {
        eventName: e.eventName,
        timestamp: normalizedTimestamp,
        properties: e.properties ?? {},
        idempotencyKey,
        eventHash,
      }
    })

    const totalReceived = withHashes.length
    // Prevent duplicates within the same request from creating duplicate rows.
    const uniqueByIdempotencyKey = new Map<string, (typeof withHashes)[number]>()
    for (const e of withHashes) {
      if (!uniqueByIdempotencyKey.has(e.idempotencyKey)) {
        uniqueByIdempotencyKey.set(e.idempotencyKey, e)
      }
    }
    const uniqueEvents = Array.from(uniqueByIdempotencyKey.values())

    const idempotencyKeys = uniqueEvents.map((x) => x.idempotencyKey)
    const ttlHours =
      this.config.get<AppConfig['events']['idempotencyTtlHours']>(
        'app.events.idempotencyTtlHours',
        { infer: true },
      ) ?? 72
    const expiresAt = new Date(Date.now() + Math.round(ttlHours * 60 * 60 * 1000))

    return this.dataSource.transaction(async (manager) => {
      const now = new Date()
      const claimed = await this.idempotencyKeys.claimKeys({
        manager,
        workspaceId,
        idempotencyKeys,
        expiresAt,
        now,
      })

      const eventsToInsert = uniqueEvents.filter((x) => claimed.has(x.idempotencyKey))
      const inserted = eventsToInsert.length
      const deduped = totalReceived - inserted

      if (eventsToInsert.length > 0) {
        const values = eventsToInsert.map((x) => ({
          workspaceId,
          sourceId,
          eventName: x.eventName,
          timestamp: x.timestamp,
          idempotencyKey: x.idempotencyKey,
          properties: x.properties,
        }))

        await this.events.bulkInsert(values as any, manager)
      }

      this.logger.log(
        `events.ingest workspaceId=${workspaceId} sourceId=${sourceId} total=${withHashes.length} inserted=${inserted} deduped=${deduped}`,
      )
      return { inserted, deduped }
    })
  }

  private stableStringify(value: unknown): string {
    const seen = new Set<unknown>()
    let keysCount = 0

    const stringify = (v: unknown): unknown => {
      if (v === null || typeof v !== 'object') {
        return v
      }

      if (seen.has(v)) {
        throw new BadRequestException({ error: 'INVALID_PROPERTIES', message: 'Circular properties not allowed' })
      }
      seen.add(v)

      if (Array.isArray(v)) {
        return v.map((item) => stringify(item))
      }

      const record = v as Record<string, unknown>
      const keys = Object.keys(record).sort()
      keysCount += keys.length
      if (keysCount > STABLE_STRINGIFY_KEYS_LIMIT) {
        throw new BadRequestException({
          error: 'INVALID_PROPERTIES',
          message: 'Properties too large to hash safely',
        })
      }
      const out: Record<string, unknown> = {}
      for (const k of keys) {
        out[k] = stringify(record[k])
      }
      return out
    }

    return JSON.stringify(stringify(value))
  }

  private hashString(input: string): string {
    return createHash('sha256').update(input).digest('hex')
  }
}

