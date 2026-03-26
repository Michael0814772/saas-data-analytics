import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { Request } from 'express'
import { WORKSPACE_ROLES_KEY } from '../../../shared/decorators/workspace-roles.decorator'
import type { WorkspaceRole } from '../../../shared/enums/workspace-role.enum'

@Injectable()
export class WorkspaceRolesGuard implements CanActivate {
  private readonly logger = new Logger(WorkspaceRolesGuard.name)

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
      this.logger.warn(`workspace.roles_guard missing_context`)
      throw new ForbiddenException({
        error: 'WORKSPACE_CONTEXT_MISSING',
        message: 'Workspace context is missing',
      })
    }
    if (!allowed.includes(wc.role)) {
      this.logger.warn(
        `workspace.roles_guard forbidden workspaceId=${wc.workspaceId} role=${wc.role}`,
      )
      throw new ForbiddenException({
        error: 'WORKSPACE_ROLE_FORBIDDEN',
        message: 'You do not have permission for this action',
      })
    }
    return true
  }
}
