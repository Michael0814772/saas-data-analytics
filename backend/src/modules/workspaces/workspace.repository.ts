import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Workspace } from './entities/workspace.entity'

@Injectable()
export class WorkspaceRepository {
  private readonly logger = new Logger(WorkspaceRepository.name)

  constructor(
    @InjectRepository(Workspace)
    private readonly repo: Repository<Workspace>,
  ) {}

  async create(data: { name: string; createdByUserId: string }): Promise<Workspace> {
    this.logger.debug(`workspaces.repo.create createdByUserId=${data.createdByUserId}`)
    const row = this.repo.create({
      name: data.name.trim(),
      createdByUserId: data.createdByUserId,
    })
    return this.repo.save(row)
  }

  async findById(id: string): Promise<Workspace | null> {
    this.logger.debug(`workspaces.repo.findById workspaceId=${id}`)
    return this.repo.findOne({ where: { id } })
  }

  async updateName(id: string, name: string): Promise<void> {
    this.logger.debug(`workspaces.repo.updateName workspaceId=${id}`)
    await this.repo.update({ id }, { name: name.trim() })
  }
}
