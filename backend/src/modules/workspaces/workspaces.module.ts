import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { UsersModule } from '../users/users.module'
import { WorkspaceInvite } from './entities/workspace-invite.entity'
import { WorkspaceMember } from './entities/workspace-member.entity'
import { Workspace } from './entities/workspace.entity'
import { WorkspaceRolesGuard } from './guards/workspace-roles.guard'
import { WorkspaceGuard } from './guards/workspace.guard'
import { WorkspaceInviteRepository } from './workspace-invite.repository'
import { WorkspaceMemberRepository } from './workspace-member.repository'
import { WorkspaceRepository } from './workspace.repository'
import { WorkspacesController } from './workspaces.controller'
import { WorkspacesService } from './workspaces.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([Workspace, WorkspaceMember, WorkspaceInvite]),
    UsersModule,
  ],
  controllers: [WorkspacesController],
  providers: [
    WorkspaceRepository,
    WorkspaceMemberRepository,
    WorkspaceInviteRepository,
    WorkspacesService,
    WorkspaceGuard,
    WorkspaceRolesGuard,
  ],
  exports: [WorkspacesService],
})
export class WorkspacesModule {}
