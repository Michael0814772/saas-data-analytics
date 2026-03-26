import {
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import { hashApiKey, generateRawApiKey, toApiKeyPrefix } from './api-key.tokens'
import { ApiKeysRepository } from './api-keys.repository'
import type { CreateApiKeyDto } from './dto/create-api-key.dto'
import { ApiKey } from './entities/api-key.entity'

@Injectable()
export class ApiKeysService {
  private readonly logger = new Logger(ApiKeysService.name)

  constructor(private readonly keys: ApiKeysRepository) {}

  async createForWorkspace(workspaceId: string, dto: CreateApiKeyDto): Promise<{
    id: string
    name: string
    key: string
    keyPrefix: string
    permissions: string[]
    sourceId: string
    createdAt: Date
  }> {
    const raw = generateRawApiKey()
    const row = await this.keys.create({
      workspaceId,
      keyHash: hashApiKey(raw),
      keyPrefix: toApiKeyPrefix(raw),
      name: dto.name,
      permissions: dto.permissions ?? [],
      sourceId: dto.sourceId.trim(),
    })
    this.logger.log(`api_keys.create success workspaceId=${workspaceId} apiKeyId=${row.id}`)
    return {
      id: row.id,
      name: row.name,
      key: raw,
      keyPrefix: row.keyPrefix,
      permissions: row.permissions,
      sourceId: row.sourceId,
      createdAt: row.createdAt,
    }
  }

  async listForWorkspace(workspaceId: string) {
    const rows = await this.keys.listActiveByWorkspace(workspaceId)
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      keyPrefix: r.keyPrefix,
      permissions: r.permissions,
      sourceId: r.sourceId,
      createdAt: r.createdAt,
      lastUsedAt: r.lastUsedAt,
    }))
  }

  async revokeForWorkspace(workspaceId: string, apiKeyId: string): Promise<{ revoked: true }> {
    const row = await this.keys.findActiveByIdAndWorkspace(apiKeyId, workspaceId)
    if (!row) {
      throw new NotFoundException({
        error: 'API_KEY_NOT_FOUND',
        message: 'API key not found in this workspace',
      })
    }
    await this.keys.revoke(apiKeyId, new Date())
    this.logger.log(`api_keys.revoke success workspaceId=${workspaceId} apiKeyId=${apiKeyId}`)
    return { revoked: true }
  }

  async resolveByRawApiKey(rawApiKey: string): Promise<ApiKey> {
    const row = await this.keys.findActiveByHash(hashApiKey(rawApiKey))
    if (!row) {
      throw new UnauthorizedException({
        error: 'INVALID_API_KEY',
        message: 'API key is invalid or revoked',
      })
    }
    await this.keys.markUsed(row.id, new Date())
    return row
  }
}
