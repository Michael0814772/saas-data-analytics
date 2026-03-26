import {
  Body,
  BadRequestException,
  Controller,
  ForbiddenException,
  Headers,
  Logger,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common'
import type { Request } from 'express'
import { apiOk } from '../../shared/http/api-response'
import { ApiKeyGuard } from '../api-keys/guards/api-key.guard'
import { Public } from '../../shared/decorators/public.decorator'
import type { ApiKeyContext } from './types/api-key-context.type'
import { EventsService } from './events.service'
import { EventSchemaRegistryService } from './event-schema-registry.service'

const MAX_EVENTS_PER_REQUEST = 1000
const MAX_INGEST_PAYLOAD_BYTES = 1024 * 1024
const EVENTS_INGEST_PERMISSION = 'events:ingest'

@Controller('events')
@UseGuards(ApiKeyGuard)
@Public()
export class EventsController {
  private readonly logger = new Logger(EventsController.name)

  constructor(
    private readonly events: EventsService,
    private readonly schemas: EventSchemaRegistryService,
  ) {}

  @Post()
  async ingest(
    @Req() req: Request & { apiKeyContext?: ApiKeyContext },
    @Body() body: unknown,
    @Headers('x-idempotency-key') idempotencyKeyHeader: string,
  ) {
    if (!idempotencyKeyHeader?.trim()) {
      throw new BadRequestException({
        error: 'IDEMPOTENCY_KEY_REQUIRED',
        message: 'Missing x-idempotency-key header',
      })
    }

    if (!req.apiKeyContext) {
      throw new BadRequestException({
        error: 'API_KEY_CONTEXT_MISSING',
        message: 'x-api-key context could not be resolved',
      })
    }

    const perms = req.apiKeyContext.permissions ?? []
    if (!perms.includes(EVENTS_INGEST_PERMISSION)) {
      throw new ForbiddenException({
        error: 'API_KEY_FORBIDDEN',
        message: `API key is missing permission: ${EVENTS_INGEST_PERMISSION}`,
      })
    }

    const payloadBytes = this.safeBodySizeBytes(body)
    if (payloadBytes > MAX_INGEST_PAYLOAD_BYTES) {
      throw new BadRequestException({
        error: 'PAYLOAD_TOO_LARGE',
        message: 'Max payload size is 1MB',
      })
    }

    const input = this.normalizeBodyToEvents(body)
    if (input.length > MAX_EVENTS_PER_REQUEST) {
      throw new BadRequestException({
        error: 'TOO_MANY_EVENTS',
        message: 'Max events per request is 1000',
      })
    }

    const inputEvents = input.map((raw, idx) => {
      const eventName = this.normalizeEventName(raw, idx)
      const properties = this.normalizeEventProperties(raw, idx)
      this.schemas.validateOrThrow({ eventName, properties, eventIndex: idx })
      const { timestamp, timestampProvided } = this.normalizeEventTimestamp(raw, idx)
      return { eventName, properties, timestamp, timestampProvided }
    })

    const result = await this.events.ingestFromApiKey({
      req,
      apiKeyContext: req.apiKeyContext,
      idempotencyKeyHeader,
      inputEvents,
    })

    this.logger.log(
      `events.ingest workspaceId=${req.apiKeyContext.workspaceId} total=${inputEvents.length} inserted=${result.inserted} deduped=${result.deduped}`,
    )

    return apiOk({ ...result, received: inputEvents.length })
  }

  private safeBodySizeBytes(body: unknown): number {
    try {
      return Buffer.byteLength(JSON.stringify(body))
    } catch {
      return MAX_INGEST_PAYLOAD_BYTES + 1
    }
  }

  private normalizeBodyToEvents(body: unknown): unknown[] {
    if (Array.isArray(body)) {
      return body
    }
    if (body && typeof body === 'object') {
      const maybe = body as Record<string, unknown>
      const events = maybe.events
      if (Array.isArray(events)) {
        return events
      }

      // Step 5 contract also allows a single event object: { eventName, properties, timestamp }
      if (typeof maybe.eventName === 'string') {
        return [body]
      }
    }
    throw new BadRequestException({
      error: 'INVALID_EVENTS_PAYLOAD',
      message: 'Expected an array of events or an object with `events: []`',
    })
  }

  private normalizeEventName(raw: any, idx: number): string {
    const value = raw?.eventName
    if (typeof value !== 'string' || !value.trim()) {
      throw new BadRequestException({
        error: 'INVALID_EVENT_NAME',
        message: `eventName is required for event index=${idx}`,
      })
    }
    if (value.trim().length > 200) {
      throw new BadRequestException({
        error: 'INVALID_EVENT_NAME',
        message: `eventName too long for event index=${idx}`,
      })
    }
    return value.trim()
  }

  private normalizeEventProperties(raw: any, idx: number): Record<string, unknown> {
    const value = raw?.properties ?? {}
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      throw new BadRequestException({
        error: 'INVALID_PROPERTIES',
        message: `properties must be an object for event index=${idx}`,
      })
    }
    return value as Record<string, unknown>
  }

  private normalizeEventTimestamp(raw: any, idx: number): { timestamp: Date; timestampProvided: boolean } {
    const value = raw?.timestamp
    if (value === undefined || value === null || value === '') {
      return { timestamp: new Date(), timestampProvided: false }
    }
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException({
        error: 'INVALID_TIMESTAMP',
        message: `timestamp must be a valid date for event index=${idx}`,
      })
    }
    return { timestamp: date, timestampProvided: true }
  }
}

