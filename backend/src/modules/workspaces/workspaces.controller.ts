import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common'
import { CurrentUser } from '../../shared/decorators/current-user.decorator'
import { CurrentWorkspace } from '../../shared/decorators/current-workspace.decorator'
import { WorkspaceRoles } from '../../shared/decorators/workspace-roles.decorator'
import { WorkspaceRole } from '../../shared/enums/workspace-role.enum'
import { apiOk } from '../../shared/http/api-response'
import type { AuthUser } from '../../shared/types/auth-user.type'
import type { WorkspaceContext } from '../../shared/types/workspace-context.type'
import { AcceptWorkspaceInviteDto } from './dto/accept-workspace-invite.dto'
import { CreateWorkspaceDto } from './dto/create-workspace.dto'
import { CreateWorkspaceInviteDto } from './dto/create-workspace-invite.dto'
import { TransferWorkspaceOwnershipDto } from './dto/transfer-workspace-ownership.dto'
import { UpdateWorkspaceMemberRoleDto } from './dto/update-workspace-member-role.dto'
import { UpdateWorkspaceDto } from './dto/update-workspace.dto'
import { WorkspaceRolesGuard } from './guards/workspace-roles.guard'
import { WorkspaceGuard } from './guards/workspace.guard'
import { WorkspacesService } from './workspaces.service'

/**
 * Multi-tenant workspace API. Tenant is selected with header `x-workspace-id` (see WorkspaceGuard).
 * Routes without that guard operate on “my workspaces” or invites by token only.
 */
@Controller('workspaces')
export class WorkspacesController {
  private readonly logger = new Logger(WorkspacesController.name)

  constructor(private readonly workspaces: WorkspacesService) {}

  /** Extra workspace beyond the automatic one created at signup. */
  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateWorkspaceDto) {
    this.logger.log(`workspaces.create request userId=${user.userId}`)
    const data = await this.workspaces.createWorkspace(user.userId, dto)
    return apiOk(data)
  }

  /** All workspaces the JWT user belongs to. */
  @Get()
  async list(@CurrentUser() user: AuthUser) {
    this.logger.log(`workspaces.list request userId=${user.userId}`)
    const data = await this.workspaces.listMine(user.userId)
    return apiOk(data)
  }

  /** Join via invite token; JWT email must match invite email. */
  @Post('invites/accept')
  async acceptInvite(
    @CurrentUser() user: AuthUser,
    @Body() dto: AcceptWorkspaceInviteDto,
  ) {
    this.logger.log(`workspaces.invites.accept request userId=${user.userId}`)
    const data = await this.workspaces.acceptInvite(user.userId, user.email, dto)
    return apiOk(data)
  }

  /** Resolve `x-workspace-id` into id, name, role for the current member. */
  @Get('context')
  @UseGuards(WorkspaceGuard)
  async context(@CurrentWorkspace() workspace: WorkspaceContext) {
    this.logger.log(
      `workspaces.context request workspaceId=${workspace.workspaceId} role=${workspace.role}`,
    )
    return apiOk({
      id: workspace.workspaceId,
      name: workspace.workspaceName,
      role: workspace.role,
      createdAt: workspace.workspaceCreatedAt,
    })
  }

  /** Remove self; sole owner must transfer ownership first. */
  @Post('leave')
  @UseGuards(WorkspaceGuard)
  async leave(
    @CurrentUser() user: AuthUser,
    @CurrentWorkspace() workspace: WorkspaceContext,
  ) {
    this.logger.log(
      `workspaces.leave request userId=${user.userId} workspaceId=${workspace.workspaceId} role=${workspace.role}`,
    )
    const data = await this.workspaces.leaveWorkspace(
      workspace.workspaceId,
      user.userId,
      workspace.role,
    )
    return apiOk(data)
  }

  /** Owner promotes another member to owner and becomes admin. */
  @Post('ownership/transfer')
  @UseGuards(WorkspaceGuard, WorkspaceRolesGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER)
  async transferOwnership(
    @CurrentUser() user: AuthUser,
    @CurrentWorkspace() workspace: WorkspaceContext,
    @Body() dto: TransferWorkspaceOwnershipDto,
  ) {
    this.logger.log(
      `workspaces.ownership.transfer request workspaceId=${workspace.workspaceId} actorUserId=${user.userId} newOwnerUserId=${dto.newOwnerUserId}`,
    )
    const data = await this.workspaces.transferOwnership(
      workspace.workspaceId,
      user.userId,
      dto.newOwnerUserId,
    )
    return apiOk(data)
  }

  /** Rename workspace (owner or admin). */
  @Patch()
  @UseGuards(WorkspaceGuard, WorkspaceRolesGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  async update(@CurrentWorkspace() workspace: WorkspaceContext, @Body() dto: UpdateWorkspaceDto) {
    this.logger.log(
      `workspaces.update request workspaceId=${workspace.workspaceId} role=${workspace.role}`,
    )
    const data = await this.workspaces.updateWorkspace(workspace.workspaceId, workspace.role, dto)
    return apiOk(data)
  }

  /** Email invite; token may be omitted from JSON in production (see config). */
  @Post('invites')
  @UseGuards(WorkspaceGuard, WorkspaceRolesGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  async createInvite(
    @CurrentUser() user: AuthUser,
    @CurrentWorkspace() workspace: WorkspaceContext,
    @Body() dto: CreateWorkspaceInviteDto,
  ) {
    this.logger.log(
      `workspaces.invites.create request workspaceId=${workspace.workspaceId} actorUserId=${user.userId} role=${workspace.role}`,
    )
    const data = await this.workspaces.createInvite(
      user.userId,
      workspace.workspaceId,
      workspace.role,
      dto,
    )
    return apiOk(data)
  }

  /** Pending invites for this workspace (not expired). */
  @Get('invites')
  @UseGuards(WorkspaceGuard, WorkspaceRolesGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  async listInvites(@CurrentWorkspace() workspace: WorkspaceContext) {
    this.logger.log(
      `workspaces.invites.list request workspaceId=${workspace.workspaceId} role=${workspace.role}`,
    )
    const data = await this.workspaces.listPendingInvites(
      workspace.workspaceId,
      workspace.role,
    )
    return apiOk(data)
  }

  /** Cancel a pending invite by id. */
  @Delete('invites/:inviteId')
  @UseGuards(WorkspaceGuard, WorkspaceRolesGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  async revokeInvite(
    @CurrentWorkspace() workspace: WorkspaceContext,
    @Param('inviteId', ParseUUIDPipe) inviteId: string,
  ) {
    this.logger.log(
      `workspaces.invites.revoke request workspaceId=${workspace.workspaceId} inviteId=${inviteId} role=${workspace.role}`,
    )
    const data = await this.workspaces.revokeInvite(
      workspace.workspaceId,
      workspace.role,
      inviteId,
    )
    return apiOk(data)
  }

  /** Directory of members (any member can list). */
  @Get('members')
  @UseGuards(WorkspaceGuard)
  async listMembers(@CurrentWorkspace() workspace: WorkspaceContext) {
    this.logger.log(`workspaces.members.list request workspaceId=${workspace.workspaceId}`)
    const data = await this.workspaces.listMembers(workspace.workspaceId)
    return apiOk(data)
  }

  /** Change another member’s role; owner invariants enforced in service. */
  @Patch('members/:userId')
  @UseGuards(WorkspaceGuard, WorkspaceRolesGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  async updateMemberRole(
    @CurrentWorkspace() workspace: WorkspaceContext,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
    @Body() dto: UpdateWorkspaceMemberRoleDto,
  ) {
    this.logger.log(
      `workspaces.members.update_role request workspaceId=${workspace.workspaceId} targetUserId=${targetUserId} actorRole=${workspace.role} newRole=${dto.role}`,
    )
    const data = await this.workspaces.updateMemberRole(
      workspace.workspaceId,
      workspace.role,
      targetUserId,
      dto.role,
    )
    return apiOk(data)
  }

  /** Remove another member (cannot remove last owner; admin cannot remove owners). */
  @Delete('members/:userId')
  @UseGuards(WorkspaceGuard, WorkspaceRolesGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  async removeMember(
    @CurrentWorkspace() workspace: WorkspaceContext,
    @Param('userId', ParseUUIDPipe) targetUserId: string,
  ) {
    this.logger.log(
      `workspaces.members.remove request workspaceId=${workspace.workspaceId} targetUserId=${targetUserId} actorRole=${workspace.role}`,
    )
    const data = await this.workspaces.removeMember(
      workspace.workspaceId,
      workspace.role,
      targetUserId,
    )
    return apiOk(data)
  }
}
