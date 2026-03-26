import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { EntityManager } from 'typeorm'
import { DataSource, IsNull } from 'typeorm'
import type { AppConfig } from '../../shared/config/configuration'
import { WorkspaceRole } from '../../shared/enums/workspace-role.enum'
import { UsersService } from '../users/users.service'
import type { AcceptWorkspaceInviteDto } from './dto/accept-workspace-invite.dto'
import type { CreateWorkspaceDto } from './dto/create-workspace.dto'
import type { CreateWorkspaceInviteDto } from './dto/create-workspace-invite.dto'
import type { UpdateWorkspaceDto } from './dto/update-workspace.dto'
import { WorkspaceInvite } from './entities/workspace-invite.entity'
import { WorkspaceMember } from './entities/workspace-member.entity'
import { Workspace } from './entities/workspace.entity'
import { DEFAULT_WORKSPACE_NAME_ON_SIGNUP } from './workspace-defaults.constants'
import {
  generateInviteToken,
  hashInviteToken,
} from './workspace-invite.tokens'
import { WorkspaceInviteDeliveryService } from './workspace-invite-delivery.service'
import { WorkspaceInviteRepository } from './workspace-invite.repository'
import { WorkspaceMemberRepository } from './workspace-member.repository'
import { WorkspaceRepository } from './workspace.repository'

/**
 * Workspace domain logic: CRUD-ish workspaces, memberships, invites, roles, leave/transfer.
 * Controllers attach `workspaceId` and actor role via guards; this service never trusts body for tenant id.
 */
@Injectable()
export class WorkspacesService {
  private readonly logger = new Logger(WorkspacesService.name)

  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    private readonly workspaces: WorkspaceRepository,
    private readonly members: WorkspaceMemberRepository,
    private readonly invites: WorkspaceInviteRepository,
    private readonly inviteDelivery: WorkspaceInviteDeliveryService,
    private readonly users: UsersService,
  ) {}

  /**
   * Used during signup: must run inside the caller's transaction so user + workspace stay consistent.
   */
  async createDefaultWorkspaceForNewUser(
    manager: EntityManager,
    userId: string,
    name: string = DEFAULT_WORKSPACE_NAME_ON_SIGNUP,
  ): Promise<void> {
    this.logger.log(`workspaces.default_create request userId=${userId}`)
    const wsRepo = manager.getRepository(Workspace)
    const memRepo = manager.getRepository(WorkspaceMember)
    const workspace = wsRepo.create({
      name: name.trim(),
      createdByUserId: userId,
    })
    const saved = await wsRepo.save(workspace)
    await memRepo.save(
      memRepo.create({
        workspaceId: saved.id,
        userId,
        role: WorkspaceRole.OWNER,
      }),
    )
    this.logger.log(`workspaces.default_create success userId=${userId} workspaceId=${saved.id}`)
  }

  /** User becomes owner of a new workspace row + membership. */
  async createWorkspace(userId: string, dto: CreateWorkspaceDto) {
    this.logger.log(`workspaces.create_workspace request userId=${userId}`)
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

  /** Dashboard list: workspaces the user is a member of. */
  async listMine(userId: string) {
    this.logger.debug(`workspaces.list_mine request userId=${userId}`)
    const rows = await this.members.listByUserId(userId)
    return rows.map((r) => ({
      id: r.workspace.id,
      name: r.workspace.name,
      role: r.role as WorkspaceRole,
      createdAt: r.workspace.createdAt,
    }))
  }

  /** Rename; requires owner or admin (see assertCanManageSettings). */
  async updateWorkspace(workspaceId: string, actorRole: WorkspaceRole, dto: UpdateWorkspaceDto) {
    this.logger.log(
      `workspaces.update_workspace request workspaceId=${workspaceId} actorRole=${actorRole}`,
    )
    this.assertCanManageSettings(actorRole)
    await this.workspaces.updateName(workspaceId, dto.name)
    return { id: workspaceId, name: dto.name.trim() }
  }

  /**
   * Pending invite with hashed token. Raw token returned only if `app.invites.exposeTokenInApi`;
   * otherwise {@link WorkspaceInviteDeliveryService} logs dev instructions.
   */
  async createInvite(
    userId: string,
    workspaceId: string,
    actorRole: WorkspaceRole,
    dto: CreateWorkspaceInviteDto,
  ) {
    this.logger.log(
      `workspaces.invite_create request workspaceId=${workspaceId} actorUserId=${userId} actorRole=${actorRole}`,
    )
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
      this.logger.warn(`workspaces.invite_create conflict invite_pending workspaceId=${workspaceId}`)
      throw new ConflictException({
        error: 'INVITE_PENDING',
        message: 'An invite is already pending for this email',
      })
    }
    const inviteCfg = this.config.get<AppConfig['invites']>('app.invites', { infer: true })
    if (!inviteCfg) {
      throw new Error('Invite configuration is missing')
    }
    const raw = generateInviteToken()
    const tokenHash = hashInviteToken(raw)
    const expiresAt = new Date(Date.now() + inviteCfg.ttlMs)
    const invite = await this.invites.create({
      workspaceId,
      email,
      role: dto.role,
      tokenHash,
      expiresAt,
      invitedByUserId: userId,
    })
    if (!inviteCfg.exposeTokenInApi) {
      this.inviteDelivery.handleInviteCreated({
        inviteId: invite.id,
        workspaceId,
        email,
        expiresAt: invite.expiresAt,
        rawToken: raw,
      })
    }
    this.logger.log(`workspaces.invite_create success workspaceId=${workspaceId} inviteId=${invite.id}`)
    return {
      id: invite.id,
      email: invite.email,
      role: invite.role,
      expiresAt: invite.expiresAt,
      ...(inviteCfg.exposeTokenInApi ? { token: raw } : {}),
    }
  }

  /** Hard-delete a pending invite row scoped to this workspace. */
  async revokeInvite(workspaceId: string, actorRole: WorkspaceRole, inviteId: string) {
    this.logger.log(
      `workspaces.invite_revoke request workspaceId=${workspaceId} actorRole=${actorRole} inviteId=${inviteId}`,
    )
    this.assertCanManageMembers(actorRole)
    const invite = await this.invites.findPendingByIdAndWorkspace(inviteId, workspaceId)
    if (!invite) {
      this.logger.warn(`workspaces.invite_revoke not_found workspaceId=${workspaceId} inviteId=${inviteId}`)
      throw new NotFoundException({
        error: 'INVITE_NOT_FOUND',
        message: 'No pending invite with that id in this workspace',
      })
    }
    await this.invites.deleteById(inviteId)
    this.logger.log(`workspaces.invite_revoke success workspaceId=${workspaceId} inviteId=${inviteId}`)
    return { revoked: true as const, id: inviteId }
  }

  /** Owner/admin view of outstanding invites (filters out expired). */
  async listPendingInvites(workspaceId: string, actorRole: WorkspaceRole) {
    this.logger.debug(
      `workspaces.invites_list request workspaceId=${workspaceId} actorRole=${actorRole}`,
    )
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

  /** Member directory with emails for the workspace. */
  async listMembers(workspaceId: string) {
    this.logger.debug(`workspaces.members_list request workspaceId=${workspaceId}`)
    return this.members.listMembersWithEmail(workspaceId)
  }

  /**
   * Role change with rules: admin cannot touch owners; only owner can grant owner;
   * cannot demote sole owner.
   */
  async updateMemberRole(
    workspaceId: string,
    actorRole: WorkspaceRole,
    targetUserId: string,
    newRole: WorkspaceRole,
  ) {
    this.logger.log(
      `workspaces.member_role_update request workspaceId=${workspaceId} actorRole=${actorRole} targetUserId=${targetUserId} newRole=${newRole}`,
    )
    this.assertCanManageMembers(actorRole)
    const target = await this.members.findByWorkspaceAndUser(workspaceId, targetUserId)
    if (!target) {
      throw new NotFoundException({
        error: 'MEMBER_NOT_FOUND',
        message: 'That user is not a member of this workspace',
      })
    }
    const targetRole = target.role as WorkspaceRole
    this.assertActorCanManageTarget(actorRole, targetRole)
    if (newRole === WorkspaceRole.OWNER && actorRole !== WorkspaceRole.OWNER) {
      throw new ForbiddenException({
        error: 'WORKSPACE_ROLE_FORBIDDEN',
        message: 'Only an owner can assign the owner role',
      })
    }
    if (targetRole === WorkspaceRole.OWNER && newRole !== WorkspaceRole.OWNER) {
      const owners = await this.members.countOwners(workspaceId)
      if (owners <= 1) {
        throw new BadRequestException({
          error: 'LAST_OWNER',
          message: 'Workspace must keep at least one owner',
        })
      }
    }
    await this.members.updateRole(workspaceId, targetUserId, newRole)
    return { userId: targetUserId, role: newRole }
  }

  /** Same guardrails as {@link updateMemberRole} for removing a row from `workspace_members`. */
  async removeMember(
    workspaceId: string,
    actorRole: WorkspaceRole,
    targetUserId: string,
  ) {
    this.logger.log(
      `workspaces.member_remove request workspaceId=${workspaceId} actorRole=${actorRole} targetUserId=${targetUserId}`,
    )
    this.assertCanManageMembers(actorRole)
    const target = await this.members.findByWorkspaceAndUser(workspaceId, targetUserId)
    if (!target) {
      throw new NotFoundException({
        error: 'MEMBER_NOT_FOUND',
        message: 'That user is not a member of this workspace',
      })
    }
    const targetRole = target.role as WorkspaceRole
    this.assertActorCanManageTarget(actorRole, targetRole)
    if (targetRole === WorkspaceRole.OWNER) {
      const owners = await this.members.countOwners(workspaceId)
      if (owners <= 1) {
        throw new BadRequestException({
          error: 'LAST_OWNER',
          message: 'Workspace must keep at least one owner',
        })
      }
    }
    await this.members.deleteByWorkspaceAndUser(workspaceId, targetUserId)
    return { removed: true as const, userId: targetUserId }
  }

  /** Current user exits; sole owner must transfer ownership first. */
  async leaveWorkspace(
    workspaceId: string,
    userId: string,
    memberRole: WorkspaceRole,
  ): Promise<{ left: true }> {
    this.logger.log(
      `workspaces.leave request workspaceId=${workspaceId} userId=${userId} role=${memberRole}`,
    )
    if (memberRole === WorkspaceRole.OWNER) {
      const owners = await this.members.countOwners(workspaceId)
      if (owners <= 1) {
        this.logger.warn(`workspaces.leave blocked_last_owner workspaceId=${workspaceId} userId=${userId}`)
        throw new BadRequestException({
          error: 'LAST_OWNER',
          message: 'Transfer ownership to another member before leaving',
        })
      }
    }
    await this.members.deleteByWorkspaceAndUser(workspaceId, userId)
    this.logger.log(`workspaces.leave success workspaceId=${workspaceId} userId=${userId}`)
    return { left: true }
  }

  /** Promote `newOwnerUserId` to owner and demote actor to admin in one transaction. */
  async transferOwnership(
    workspaceId: string,
    actorUserId: string,
    newOwnerUserId: string,
  ): Promise<{
    newOwnerUserId: string
    yourNewRole: WorkspaceRole
  }> {
    this.logger.log(
      `workspaces.ownership_transfer request workspaceId=${workspaceId} actorUserId=${actorUserId} newOwnerUserId=${newOwnerUserId}`,
    )
    if (actorUserId === newOwnerUserId) {
      throw new BadRequestException({
        error: 'INVALID_TRANSFER',
        message: 'Choose another member to receive ownership',
      })
    }
    const actor = await this.members.findByWorkspaceAndUser(workspaceId, actorUserId)
    if (!actor || (actor.role as WorkspaceRole) !== WorkspaceRole.OWNER) {
      throw new ForbiddenException({
        error: 'WORKSPACE_ROLE_FORBIDDEN',
        message: 'Only a workspace owner can transfer ownership',
      })
    }
    const target = await this.members.findByWorkspaceAndUser(workspaceId, newOwnerUserId)
    if (!target) {
      throw new NotFoundException({
        error: 'MEMBER_NOT_FOUND',
        message: 'That user is not a member of this workspace',
      })
    }
    await this.dataSource.transaction(async (manager) => {
      const memRepo = manager.getRepository(WorkspaceMember)
      await memRepo.update(
        { workspaceId, userId: newOwnerUserId },
        { role: WorkspaceRole.OWNER },
      )
      await memRepo.update(
        { workspaceId, userId: actorUserId },
        { role: WorkspaceRole.ADMIN },
      )
    })
    this.logger.log(
      `workspaces.ownership_transfer success workspaceId=${workspaceId} actorUserId=${actorUserId} newOwnerUserId=${newOwnerUserId}`,
    )
    return {
      newOwnerUserId,
      yourNewRole: WorkspaceRole.ADMIN,
    }
  }

  /** Validate token + email match, add membership, mark invite accepted (transactional). */
  async acceptInvite(actorUserId: string, actorEmail: string, dto: AcceptWorkspaceInviteDto) {
    this.logger.log(`workspaces.invite_accept request userId=${actorUserId}`)
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
      this.logger.log(
        `workspaces.invite_accept success userId=${actorUserId} workspaceId=${invite.workspaceId}`,
      )
      return {
        workspaceId: invite.workspaceId,
        workspaceName: invite.workspace.name,
        role: invite.role as WorkspaceRole,
        alreadyMember: false,
      }
    })
  }

  /** Invite/member admin actions: owner or admin only. */
  private assertCanManageMembers(role: WorkspaceRole) {
    if (role !== WorkspaceRole.OWNER && role !== WorkspaceRole.ADMIN) {
      throw new ForbiddenException({
        error: 'WORKSPACE_ROLE_FORBIDDEN',
        message: 'You need admin or owner role for this action',
      })
    }
  }

  /** Admins must not modify or remove workspace owners. */
  private assertActorCanManageTarget(
    actorRole: WorkspaceRole,
    targetRole: WorkspaceRole,
  ) {
    if (actorRole === WorkspaceRole.ADMIN && targetRole === WorkspaceRole.OWNER) {
      throw new ForbiddenException({
        error: 'WORKSPACE_ROLE_FORBIDDEN',
        message: 'Only an owner can change or remove another owner',
      })
    }
  }

  /** Workspace rename uses same bar as member management. */
  private assertCanManageSettings(role: WorkspaceRole) {
    this.assertCanManageMembers(role)
  }
}
