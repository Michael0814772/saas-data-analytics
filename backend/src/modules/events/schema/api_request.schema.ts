import type { EventSchema } from './event-schema.type'

export const apiRequestSchema: EventSchema = {
  eventName: 'api_request',
  description: 'An API request was made by a client',
  required: {
    method: 'string',
    path: 'string',
    status: 'number',
  },
  optional: {
    durationMs: 'number',
    requestId: 'string',
  },
}

