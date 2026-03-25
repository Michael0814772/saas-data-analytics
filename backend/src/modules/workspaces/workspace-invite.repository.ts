import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { IsNull, Repository } from 'typeorm'
import { WorkspaceInvite } from './entities/workspace-invite.entity'

@Injectable()
export class WorkspaceInviteRepository {
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
    return this.repo.findOne({
      where: { tokenHash, acceptedAt: IsNull() },
      relations: { workspace: true },
    })
  }

  async findPendingByWorkspaceAndEmail(
    workspaceId: string,
    email: string,
  ): Promise<WorkspaceInvite | null> {
    return this.repo.findOne({
      where: {
        workspaceId,
        email,
        acceptedAt: IsNull(),
      },
    })
  }

  async listPendingByWorkspace(workspaceId: string): Promise<WorkspaceInvite[]> {
    return this.repo.find({
      where: { workspaceId, acceptedAt: IsNull() },
      order: { createdAt: 'DESC' },
    })
  }

  async markAccepted(id: string, acceptedAt: Date): Promise<void> {
    await this.repo.update({ id }, { acceptedAt })
  }
}
