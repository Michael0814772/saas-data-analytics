import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common'
import type { Request } from 'express'
import type { WorkspaceContext } from '../types/workspace-context.type'

export const CurrentWorkspace = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): WorkspaceContext => {
    const request = ctx.switchToHttp().getRequest<Request>()
    const workspace = request.workspaceContext
    if (!workspace) {
      throw new InternalServerErrorException('Workspace context was not resolved')
    }
    return workspace
  },
)
