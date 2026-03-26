import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common'
import type { Request } from 'express'
import { ApiKeysService } from '../api-keys.service'

const API_KEY_HEADER = 'x-api-key'

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name)

  constructor(private readonly apiKeys: ApiKeysService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>()
    const raw = req.headers[API_KEY_HEADER]
    const apiKey = Array.isArray(raw) ? raw[0] : raw
    if (!apiKey?.trim()) {
      throw new BadRequestException({
        error: 'API_KEY_REQUIRED',
        message: `Missing ${API_KEY_HEADER} header`,
      })
    }
    const key = apiKey.trim()
    if (key.length < 20) {
      throw new UnauthorizedException({
        error: 'INVALID_API_KEY',
        message: 'API key is invalid or revoked',
      })
    }
    const resolved = await this.apiKeys.resolveByRawApiKey(key)
    this.logger.debug(`api_key.guard resolved workspaceId=${resolved.workspaceId}`)
    req.apiKeyContext = {
      apiKeyId: resolved.id,
      workspaceId: resolved.workspaceId,
      sourceId: resolved.sourceId,
      permissions: resolved.permissions,
    }
    return true
  }
}
