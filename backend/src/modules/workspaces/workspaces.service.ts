import {
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { DataSource, IsNull } from 'typeorm'
import { WorkspaceRole } from '../../shared/enums/workspace-role.enum'
import { UsersService } from '../users/users.service'
import type { AcceptWorkspaceInviteDto } from './dto/accept-workspace-invite.dto'
import type { CreateWorkspaceDto } from './dto/create-workspace.dto'
import type { CreateWorkspaceInviteDto } from './dto/create-workspace-invite.dto'
import type { UpdateWorkspaceDto } from './dto/update-workspace.dto'
import { WorkspaceInvite } from './entities/workspace-invite.entity'
import { WorkspaceMember } from './entities/workspace-member.entity'
import {
  generateInviteToken,
  hashInviteToken,
} from './workspace-invite.tokens'
import { WorkspaceInviteRepository } from './workspace-invite.repository'
import { WorkspaceMemberRepository } from './workspace-member.repository'
import { WorkspaceRepository } from './workspace.repository'

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000

@Injectable()
export class WorkspacesService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly workspaces: WorkspaceRepository,
    private readonly members: WorkspaceMemberRepository,
    private readonly invites: WorkspaceInviteRepository,
    private readonly users: UsersService,
  ) {}

  async createWorkspace(userId: string, dto: CreateWorkspaceDto) {
    const workspace = await this.workspaces.create({
      name: dto.name,
      createdByUserId: userId,
    })
    await this.members.create({
      workspaceId: workspace.id,
      userId,
      role: WorkspaceRole.OWNER,
    })
    return {
      id: workspace.id,
      name: workspace.name,
      role: WorkspaceRole.OWNER,
      createdAt: workspace.createdAt,
    }
  }

  async listMine(userId: string) {
    const rows = await this.members.listByUserId(userId)
    return rows.map((r) => ({
      id: r.workspace.id,
      name: r.workspace.name,
      role: r.role as WorkspaceRole,
      createdAt: r.workspace.createdAt,
    }))
  }

  async updateWorkspace(workspaceId: string, actorRole: WorkspaceRole, dto: UpdateWorkspaceDto) {
    this.assertCanManageSettings(actorRole)
    await this.workspaces.updateName(workspaceId, dto.name)
    return { id: workspaceId, name: dto.name.trim() }
  }

  async createInvite(
    userId: string,
    workspaceId: string,
    actorRole: WorkspaceRole,
    dto: CreateWorkspaceInviteDto,
  ) {
    this.assertCanManageMembers(actorRole)
    const email = dto.email.toLowerCase()
    const existingUser = await this.users.findByEmail(email)
    if (existingUser) {
      const member = await this.members.findByWorkspaceAndUser(
        workspaceId,
        existingUser.id,
      )
      if (member) {
        throw new ConflictException({
          error: 'ALREADY_MEMBER',
          message: 'User is already a member of this workspace',
        })
      }
    }
    const pending = await this.invites.findPendingByWorkspaceAndEmail(workspaceId, email)
    if (pending) {
      throw new ConflictException({
        error: 'INVITE_PENDING',
        message: 'An invite is already pending for this email',
      })
    }
    const raw = generateInviteToken()
    const tokenHash = hashInviteToken(raw)
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS)
    const invite = await this.invites.create({
      workspaceId,
      email,
      role: dto.role,
      tokenHash,
      expiresAt,
      invitedByUserId: userId,
    })
    return {
      id: invite.id,
      email: invite.email,
      role: invite.role,
      expiresAt: invite.expiresAt,
      token: raw,
    }
  }

  async listPendingInvites(workspaceId: string, actorRole: WorkspaceRole) {
    this.assertCanManageMembers(actorRole)
    const list = await this.invites.listPendingByWorkspace(workspaceId)
    const now = Date.now()
    return list
      .filter((i) => i.expiresAt.getTime() > now)
      .map((i) => ({
        id: i.id,
        email: i.email,
        role: i.role,
        expiresAt: i.expiresAt,
        createdAt: i.createdAt,
      }))
  }

  async listMembers(workspaceId: string) {
    return this.members.listMembersWithEmail(workspaceId)
  }

  async acceptInvite(actorUserId: string, actorEmail: string, dto: AcceptWorkspaceInviteDto) {
    const hash = hashInviteToken(dto.token)
    return this.dataSource.transaction(async (manager) => {
      const inviteRepo = manager.getRepository(WorkspaceInvite)
      const memberRepo = manager.getRepository(WorkspaceMember)
      const invite = await inviteRepo.findOne({
        where: { tokenHash: hash, acceptedAt: IsNull() },
        relations: { workspace: true },
      })
      if (!invite?.workspace) {
        throw new UnauthorizedException({
          error: 'INVALID_INVITE',
          message: 'Invite is invalid or has already been used',
        })
      }
      if (invite.expiresAt.getTime() <= Date.now()) {
        throw new UnauthorizedException({
          error: 'INVALID_INVITE',
          message: 'Invite is invalid or has already been used',
        })
      }
      if (invite.email !== actorEmail.toLowerCase()) {
        throw new ForbiddenException({
          error: 'INVITE_EMAIL_MISMATCH',
          message: 'This invite was sent to a different email address',
        })
      }
      const existing = await memberRepo.findOne({
        where: { workspaceId: invite.workspaceId, userId: actorUserId },
      })
      if (existing) {
        await inviteRepo.update({ id: invite.id }, { acceptedAt: new Date() })
        return {
          workspaceId: invite.workspaceId,
          workspaceName: invite.workspace.name,
          role: existing.role as WorkspaceRole,
          alreadyMember: true,
        }
      }
      await memberRepo.save(
        memberRepo.create({
          workspaceId: invite.workspaceId,
          userId: actorUserId,
          role: invite.role,
        }),
      )
      await inviteRepo.update({ id: invite.id }, { acceptedAt: new Date() })
      return {
        workspaceId: invite.workspaceId,
        workspaceName: invite.workspace.name,
        role: invite.role as WorkspaceRole,
        alreadyMember: false,
      }
    })
  }

  private assertCanManageMembers(role: WorkspaceRole) {
    if (role !== WorkspaceRole.OWNER && role !== WorkspaceRole.ADMIN) {
      throw new ForbiddenException({
        error: 'WORKSPACE_ROLE_FORBIDDEN',
        message: 'You need admin or owner role for this action',
      })
    }
  }

  private assertCanManageSettings(role: WorkspaceRole) {
    this.assertCanManageMembers(role)
  }
}
