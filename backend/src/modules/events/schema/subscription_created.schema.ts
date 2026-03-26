import type { EventSchema } from './event-schema.type'

export const subscriptionCreatedSchema: EventSchema = {
  eventName: 'subscription_created',
  description: 'A workspace subscription was created',
  required: {
    workspaceId: 'uuid',
    plan: 'string',
  },
  optional: {
    trialEndsAt: 'datetime',
  },
}

