import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { IsNull, Repository } from 'typeorm'
import { ApiKey } from './entities/api-key.entity'

@Injectable()
export class ApiKeysRepository {
  private readonly logger = new Logger(ApiKeysRepository.name)

  constructor(
    @InjectRepository(ApiKey)
    private readonly repo: Repository<ApiKey>,
  ) {}

  async create(data: {
    workspaceId: string
    keyHash: string
    keyPrefix: string
    name: string
    permissions: string[]
    sourceId: string
  }): Promise<ApiKey> {
    this.logger.debug(`api_keys.repo.create workspaceId=${data.workspaceId}`)
    const row = this.repo.create({
      workspaceId: data.workspaceId,
      keyHash: data.keyHash,
      keyPrefix: data.keyPrefix,
      name: data.name.trim(),
      permissions: data.permissions,
      sourceId: data.sourceId,
      lastUsedAt: null,
      revokedAt: null,
    })
    return this.repo.save(row)
  }

  async listActiveByWorkspace(workspaceId: string): Promise<ApiKey[]> {
    this.logger.debug(`api_keys.repo.list workspaceId=${workspaceId}`)
    return this.repo.find({
      where: { workspaceId, revokedAt: IsNull() },
      order: { createdAt: 'DESC' },
    })
  }

  async findActiveByHash(keyHash: string): Promise<ApiKey | null> {
    this.logger.debug(`api_keys.repo.findByHash`)
    return this.repo.findOne({
      where: { keyHash, revokedAt: IsNull() },
    })
  }

  async findActiveByIdAndWorkspace(id: string, workspaceId: string): Promise<ApiKey | null> {
    return this.repo.findOne({
      where: { id, workspaceId, revokedAt: IsNull() },
    })
  }

  async markUsed(id: string, at: Date): Promise<void> {
    await this.repo.update({ id }, { lastUsedAt: at })
  }

  async revoke(id: string, at: Date): Promise<void> {
    await this.repo.update({ id }, { revokedAt: at })
  }
}
