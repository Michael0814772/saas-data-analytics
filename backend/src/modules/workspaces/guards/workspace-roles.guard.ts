import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { Request } from 'express'
import { WORKSPACE_ROLES_KEY } from '../../../shared/decorators/workspace-roles.decorator'
import type { WorkspaceRole } from '../../../shared/enums/workspace-role.enum'

@Injectable()
export class WorkspaceRolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const allowed = this.reflector.getAllAndOverride<WorkspaceRole[]>(WORKSPACE_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ])
    if (!allowed?.length) {
      return true
    }
    const req = context.switchToHttp().getRequest<Request>()
    const wc = req.workspaceContext
    if (!wc) {
      throw new ForbiddenException({
        error: 'WORKSPACE_CONTEXT_MISSING',
        message: 'Workspace context is missing',
      })
    }
    if (!allowed.includes(wc.role)) {
      throw new ForbiddenException({
        error: 'WORKSPACE_ROLE_FORBIDDEN',
        message: 'You do not have permission for this action',
      })
    }
    return true
  }
}
