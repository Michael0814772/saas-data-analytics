import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common'
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
import { UpdateWorkspaceDto } from './dto/update-workspace.dto'
import { WorkspaceRolesGuard } from './guards/workspace-roles.guard'
import { WorkspaceGuard } from './guards/workspace.guard'
import { WorkspacesService } from './workspaces.service'

@Controller('workspaces')
export class WorkspacesController {
  constructor(private readonly workspaces: WorkspacesService) {}

  @Post()
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateWorkspaceDto) {
    const data = await this.workspaces.createWorkspace(user.userId, dto)
    return apiOk(data)
  }

  @Get()
  async list(@CurrentUser() user: AuthUser) {
    const data = await this.workspaces.listMine(user.userId)
    return apiOk(data)
  }

  @Post('invites/accept')
  async acceptInvite(
    @CurrentUser() user: AuthUser,
    @Body() dto: AcceptWorkspaceInviteDto,
  ) {
    const data = await this.workspaces.acceptInvite(user.userId, user.email, dto)
    return apiOk(data)
  }

  @Get('context')
  @UseGuards(WorkspaceGuard)
  async context(@CurrentWorkspace() workspace: WorkspaceContext) {
    return apiOk({
      id: workspace.workspaceId,
      name: workspace.workspaceName,
      role: workspace.role,
      createdAt: workspace.workspaceCreatedAt,
    })
  }

  @Patch()
  @UseGuards(WorkspaceGuard, WorkspaceRolesGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  async update(@CurrentWorkspace() workspace: WorkspaceContext, @Body() dto: UpdateWorkspaceDto) {
    const data = await this.workspaces.updateWorkspace(workspace.workspaceId, workspace.role, dto)
    return apiOk(data)
  }

  @Post('invites')
  @UseGuards(WorkspaceGuard, WorkspaceRolesGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  async createInvite(
    @CurrentUser() user: AuthUser,
    @CurrentWorkspace() workspace: WorkspaceContext,
    @Body() dto: CreateWorkspaceInviteDto,
  ) {
    const data = await this.workspaces.createInvite(
      user.userId,
      workspace.workspaceId,
      workspace.role,
      dto,
    )
    return apiOk(data)
  }

  @Get('invites')
  @UseGuards(WorkspaceGuard, WorkspaceRolesGuard)
  @WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
  async listInvites(@CurrentWorkspace() workspace: WorkspaceContext) {
    const data = await this.workspaces.listPendingInvites(
      workspace.workspaceId,
      workspace.role,
    )
    return apiOk(data)
  }

  @Get('members')
  @UseGuards(WorkspaceGuard)
  async listMembers(@CurrentWorkspace() workspace: WorkspaceContext) {
    const data = await this.workspaces.listMembers(workspace.workspaceId)
    return apiOk(data)
  }
}
