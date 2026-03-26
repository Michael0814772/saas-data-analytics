import {
  Body,
  Controller,
  Delete,
  Get,
  Logger,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common'
import { CurrentWorkspace } from '../../shared/decorators/current-workspace.decorator'
import { WorkspaceRoles } from '../../shared/decorators/workspace-roles.decorator'
import { WorkspaceRole } from '../../shared/enums/workspace-role.enum'
import { apiOk } from '../../shared/http/api-response'
import type { WorkspaceContext } from '../../shared/types/workspace-context.type'
import { CreateApiKeyDto } from './dto/create-api-key.dto'
import { ApiKeysService } from './api-keys.service'
import { WorkspaceRolesGuard } from '../workspaces/guards/workspace-roles.guard'
import { WorkspaceGuard } from '../workspaces/guards/workspace.guard'

@Controller('workspaces/api-keys')
@UseGuards(WorkspaceGuard, WorkspaceRolesGuard)
@WorkspaceRoles(WorkspaceRole.OWNER, WorkspaceRole.ADMIN)
export class ApiKeysController {
  private readonly logger = new Logger(ApiKeysController.name)

  constructor(private readonly apiKeys: ApiKeysService) {}

  /** Creates API key; raw token returned once in response. */
  @Post()
  async create(
    @CurrentWorkspace() workspace: WorkspaceContext,
    @Body() dto: CreateApiKeyDto,
  ) {
    this.logger.log(`api_keys.create request workspaceId=${workspace.workspaceId}`)
    const data = await this.apiKeys.createForWorkspace(workspace.workspaceId, dto)
    return apiOk(data)
  }

  @Get()
  async list(@CurrentWorkspace() workspace: WorkspaceContext) {
    const data = await this.apiKeys.listForWorkspace(workspace.workspaceId)
    return apiOk(data)
  }

  @Delete(':apiKeyId')
  async revoke(
    @CurrentWorkspace() workspace: WorkspaceContext,
    @Param('apiKeyId', ParseUUIDPipe) apiKeyId: string,
  ) {
    const data = await this.apiKeys.revokeForWorkspace(workspace.workspaceId, apiKeyId)
    return apiOk(data)
  }
}
