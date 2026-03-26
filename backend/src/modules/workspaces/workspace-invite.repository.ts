import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { IsNull, Repository } from 'typeorm'
import { WorkspaceInvite } from './entities/workspace-invite.entity'

@Injectable()
export class WorkspaceInviteRepository {
  private readonly logger = new Logger(WorkspaceInviteRepository.name)

  constructor(
    @InjectRepository(WorkspaceInvite)
    private readonly repo: Repository<WorkspaceInvite>,
  ) {}

  async create(data: {
    workspaceId: string
    email: string
    role: string
    tokenHash: string
    expiresAt: Date
    invitedByUserId: string
  }): Promise<WorkspaceInvite> {
    this.logger.debug(`workspaces.invites.repo.create workspaceId=${data.workspaceId}`)
    const row = this.repo.create({
      workspaceId: data.workspaceId,
      email: data.email,
      role: data.role,
      tokenHash: data.tokenHash,
      expiresAt: data.expiresAt,
      invitedByUserId: data.invitedByUserId,
    })
    return this.repo.save(row)
  }

  async findPendingByTokenHash(tokenHash: string): Promise<WorkspaceInvite | null> {
    this.logger.debug(`workspaces.invites.repo.findByTokenHash`)
    return this.repo.findOne({
      where: { tokenHash, acceptedAt: IsNull() },
      relations: { workspace: true },
    })
  }

  async findPendingByWorkspaceAndEmail(
    workspaceId: string,
    email: string,
  ): Promise<WorkspaceInvite | null> {
    this.logger.debug(`workspaces.invites.repo.findByWorkspaceAndEmail workspaceId=${workspaceId}`)
    return this.repo.findOne({
      where: {
        workspaceId,
        email,
        acceptedAt: IsNull(),
      },
    })
  }

  async listPendingByWorkspace(workspaceId: string): Promise<WorkspaceInvite[]> {
    this.logger.debug(`workspaces.invites.repo.listPending workspaceId=${workspaceId}`)
    return this.repo.find({
      where: { workspaceId, acceptedAt: IsNull() },
      order: { createdAt: 'DESC' },
    })
  }

  async markAccepted(id: string, acceptedAt: Date): Promise<void> {
    this.logger.debug(`workspaces.invites.repo.markAccepted inviteId=${id}`)
    await this.repo.update({ id }, { acceptedAt })
  }

  async findPendingByIdAndWorkspace(
    inviteId: string,
    workspaceId: string,
  ): Promise<WorkspaceInvite | null> {
    this.logger.debug(`workspaces.invites.repo.findById inviteId=${inviteId}`)
    return this.repo.findOne({
      where: { id: inviteId, workspaceId, acceptedAt: IsNull() },
    })
  }

  async deleteById(id: string): Promise<void> {
    this.logger.debug(`workspaces.invites.repo.delete inviteId=${id}`)
    await this.repo.delete({ id })
  }
}
