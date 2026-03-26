import type { EventSchema } from './event-schema.type'
import { apiRequestSchema } from './api_request.schema'
import { subscriptionCreatedSchema } from './subscription_created.schema'
import { userSignupSchema } from './user_signup.schema'

export const EVENT_SCHEMAS: EventSchema[] = [
  userSignupSchema,
  apiRequestSchema,
  subscriptionCreatedSchema,
]

