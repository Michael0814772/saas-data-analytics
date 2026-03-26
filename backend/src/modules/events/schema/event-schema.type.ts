export type EventPropertyType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'datetime'
  | 'uuid'
  | 'object'
  | 'array'

export type EventSchema = {
  eventName: string
  description: string
  required: Record<string, EventPropertyType>
  optional?: Record<string, EventPropertyType>
}

