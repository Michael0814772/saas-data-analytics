import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Workspace } from './entities/workspace.entity'

@Injectable()
export class WorkspaceRepository {
  constructor(
    @InjectRepository(Workspace)
    private readonly repo: Repository<Workspace>,
  ) {}

  async create(data: { name: string; createdByUserId: string }): Promise<Workspace> {
    const row = this.repo.create({
      name: data.name.trim(),
      createdByUserId: data.createdByUserId,
    })
    return this.repo.save(row)
  }

  async findById(id: string): Promise<Workspace | null> {
    return this.repo.findOne({ where: { id } })
  }

  async updateName(id: string, name: string): Promise<void> {
    await this.repo.update({ id }, { name: name.trim() })
  }
}
