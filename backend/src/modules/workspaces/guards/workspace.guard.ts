import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common'
import { isUUID } from 'class-validator'
import type { Request } from 'express'
import { X_WORKSPACE_ID_HEADER } from '../../../shared/constants/workspace-header'
import { WorkspaceRole } from '../../../shared/enums/workspace-role.enum'
import type { AuthUser } from '../../../shared/types/auth-user.type'
import { WorkspaceMemberRepository } from '../workspace-member.repository'

@Injectable()
export class WorkspaceGuard implements CanActivate {
  private readonly logger = new Logger(WorkspaceGuard.name)

  constructor(private readonly members: WorkspaceMemberRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>()
    const user = req.user as AuthUser | undefined
    if (!user?.userId) {
      this.logger.warn(`workspace.guard unauthorized`)
      throw new UnauthorizedException({
        error: 'UNAUTHORIZED',
        message: 'Authentication required',
      })
    }
    const raw = req.headers[X_WORKSPACE_ID_HEADER]
    const workspaceId = Array.isArray(raw) ? raw[0] : raw
    if (!workspaceId?.trim()) {
      this.logger.warn(`workspace.guard missing_header userId=${user.userId}`)
      throw new BadRequestException({
        error: 'WORKSPACE_REQUIRED',
        message: `Missing ${X_WORKSPACE_ID_HEADER} header`,
      })
    }
    const id = workspaceId.trim()
    if (!isUUID(id, 4)) {
      this.logger.warn(`workspace.guard invalid_header userId=${user.userId}`)
      throw new BadRequestException({
        error: 'INVALID_WORKSPACE_ID',
        message: `${X_WORKSPACE_ID_HEADER} must be a valid UUID`,
      })
    }
    const row = await this.members.findMembershipWithWorkspace(id, user.userId)
    if (!row) {
      this.logger.warn(`workspace.guard forbidden userId=${user.userId} workspaceId=${id}`)
      throw new ForbiddenException({
        error: 'WORKSPACE_FORBIDDEN',
        message: 'You are not a member of this workspace',
      })
    }
    req.workspaceContext = {
      workspaceId: row.workspace.id,
      role: row.member.role as WorkspaceRole,
      workspaceName: row.workspace.name,
      workspaceCreatedAt: row.workspace.createdAt,
    }
    return true
  }
}
