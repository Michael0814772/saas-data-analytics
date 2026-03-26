import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { WorkspaceRole } from '../../shared/enums/workspace-role.enum'
import { Workspace } from './entities/workspace.entity'
import { WorkspaceMember } from './entities/workspace-member.entity'

@Injectable()
export class WorkspaceMemberRepository {
  constructor(
    @InjectRepository(WorkspaceMember)
    private readonly repo: Repository<WorkspaceMember>,
  ) {}

  async create(data: {
    workspaceId: string
    userId: string
    role: string
  }): Promise<WorkspaceMember> {
    const row = this.repo.create({
      workspaceId: data.workspaceId,
      userId: data.userId,
      role: data.role,
    })
    return this.repo.save(row)
  }

  async findByWorkspaceAndUser(
    workspaceId: string,
    userId: string,
  ): Promise<WorkspaceMember | null> {
    return this.repo.findOne({ where: { workspaceId, userId } })
  }

  async findMembershipWithWorkspace(
    workspaceId: string,
    userId: string,
  ): Promise<{ member: WorkspaceMember; workspace: Workspace } | null> {
    const member = await this.repo.findOne({
      where: { workspaceId, userId },
      relations: { workspace: true },
    })
    if (!member?.workspace) {
      return null
    }
    return { member, workspace: member.workspace }
  }

  async listByUserId(userId: string): Promise<
    Array<{
      role: string
      workspace: Workspace
    }>
  > {
    const rows = await this.repo.find({
      where: { userId },
      relations: { workspace: true },
      order: { createdAt: 'ASC' },
    })
    return rows
      .filter((r): r is WorkspaceMember & { workspace: Workspace } => Boolean(r.workspace))
      .map((r) => ({ role: r.role, workspace: r.workspace }))
  }

  async listMembersWithEmail(workspaceId: string): Promise<
    Array<{
      userId: string
      email: string
      role: string
      joinedAt: Date
    }>
  > {
    const rows = await this.repo.find({
      where: { workspaceId },
      relations: { user: true },
      order: { createdAt: 'ASC' },
    })
    return rows
      .filter((r) => Boolean(r.user))
      .map((r) => ({
        userId: r.userId,
        email: r.user.email,
        role: r.role,
        joinedAt: r.createdAt,
      }))
  }

  async countOwners(workspaceId: string): Promise<number> {
    return this.repo.count({
      where: { workspaceId, role: WorkspaceRole.OWNER },
    })
  }

  async updateRole(workspaceId: string, userId: string, role: string): Promise<void> {
    await this.repo.update({ workspaceId, userId }, { role })
  }

  async deleteByWorkspaceAndUser(workspaceId: string, userId: string): Promise<void> {
    await this.repo.delete({ workspaceId, userId })
  }
}
