import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { AppConfig } from '../../shared/config/configuration'
import { EVENT_SCHEMAS } from './schema/schemas'
import type { EventPropertyType, EventSchema } from './schema/event-schema.type'

@Injectable()
export class EventSchemaRegistryService {
  private readonly logger = new Logger(EventSchemaRegistryService.name)
  private readonly schemasByName: Map<string, EventSchema>

  constructor(private readonly config: ConfigService) {
    this.schemasByName = new Map(EVENT_SCHEMAS.map((s) => [s.eventName, s]))
  }

  validateOrThrow(params: {
    eventName: string
    properties: Record<string, unknown>
    eventIndex: number
  }): void {
    const enforce =
      this.config.get<AppConfig['events']['schemaEnforce']>('app.events.schemaEnforce', {
        infer: true,
      }) ?? false

    const schema = this.schemasByName.get(params.eventName)
    if (!schema) {
      if (!enforce) {
        this.logger.debug(`events.schema unknown_event ignored eventName=${params.eventName}`)
        return
      }
      throw new BadRequestException({
        error: 'EVENT_SCHEMA_NOT_FOUND',
        message: `No schema registered for eventName=${params.eventName} (index=${params.eventIndex})`,
      })
    }

    const required = schema.required ?? {}
    for (const [key, type] of Object.entries(required)) {
      if (!(key in params.properties)) {
        throw new BadRequestException({
          error: 'INVALID_PROPERTIES',
          message: `Missing required property "${key}" for eventName=${params.eventName} (index=${params.eventIndex})`,
        })
      }
      this.assertTypeOrThrow({
        eventName: params.eventName,
        key,
        expected: type,
        value: params.properties[key],
        eventIndex: params.eventIndex,
      })
    }

    const optional = schema.optional ?? {}
    for (const [key, type] of Object.entries(optional)) {
      if (!(key in params.properties)) {
        continue
      }
      this.assertTypeOrThrow({
        eventName: params.eventName,
        key,
        expected: type,
        value: params.properties[key],
        eventIndex: params.eventIndex,
      })
    }
  }

  private assertTypeOrThrow(params: {
    eventName: string
    key: string
    expected: EventPropertyType
    value: unknown
    eventIndex: number
  }): void {
    const ok = this.isType(params.value, params.expected)
    if (ok) {
      return
    }
    throw new BadRequestException({
      error: 'INVALID_PROPERTIES',
      message: `Invalid type for "${params.key}" expected=${params.expected} eventName=${params.eventName} (index=${params.eventIndex})`,
    })
  }

  private isType(value: unknown, expected: EventPropertyType): boolean {
    if (expected === 'string') {
      return typeof value === 'string'
    }
    if (expected === 'number') {
      return typeof value === 'number' && Number.isFinite(value)
    }
    if (expected === 'boolean') {
      return typeof value === 'boolean'
    }
    if (expected === 'object') {
      return value !== null && typeof value === 'object' && !Array.isArray(value)
    }
    if (expected === 'array') {
      return Array.isArray(value)
    }
    if (expected === 'datetime') {
      if (typeof value !== 'string') {
        return false
      }
      const d = new Date(value)
      return !Number.isNaN(d.getTime())
    }
    if (expected === 'uuid') {
      if (typeof value !== 'string') {
        return false
      }
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        value,
      )
    }
    return false
  }
}

