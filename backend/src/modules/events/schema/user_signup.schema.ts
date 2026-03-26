import type { EventSchema } from './event-schema.type'

export const userSignupSchema: EventSchema = {
  eventName: 'user_signup',
  description: 'A user created an account',
  required: {
    email: 'string',
  },
  optional: {
    created: 'boolean',
  },
}

