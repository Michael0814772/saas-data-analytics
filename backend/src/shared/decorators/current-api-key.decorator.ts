import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import type { Request } from 'express'

export const CurrentApiKeyContext = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<Request & { apiKeyContext?: unknown }>()
    return request.apiKeyContext
  },
)

