import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { DatasourceEntity } from './entities/datasource.entity'
import type { EntityManager } from 'typeorm'
import { DatasourceStatus } from './enums/datasource-status.enum'

@Injectable()
export class DatasourcesRepository {
  private readonly logger = new Logger(DatasourcesRepository.name)

  constructor(
    @InjectRepository(DatasourceEntity)
    private readonly repo: Repository<DatasourceEntity>,
  ) {}

  async create(params: {
    manager?: EntityManager
    workspaceId: string
    type: string
    config: Record<string, unknown>
    status: DatasourceStatus
  }): Promise<DatasourceEntity> {
    const target = params.manager ? params.manager.getRepository(DatasourceEntity) : this.repo
    const row = target.create({
      workspaceId: params.workspaceId,
      type: params.type,
      config: params.config,
      status: params.status,
    })
    this.logger.debug(`datasources.repo.create workspaceId=${params.workspaceId}`)
    return target.save(row)
  }

  async findByWorkspaceAndId(workspaceId: string, datasourceId: string): Promise<DatasourceEntity | null> {
    return this.repo.findOne({ where: { workspaceId, id: datasourceId } })
  }

  async updateStatus(params: {
    workspaceId: string
    datasourceId: string
    status: DatasourceStatus
    lastSync?: Date | null
  }): Promise<void> {
    // TypeORM strict types sometimes struggle with jsonb columns in partial updates.
    // Keep the patch minimal and cast to the expected update shape.
    const patch: any = { status: params.status }
    if ('lastSync' in params) {
      patch.lastSync = params.lastSync ?? null
    }
    await this.repo.update({ workspaceId: params.workspaceId, id: params.datasourceId }, patch)
  }
}

