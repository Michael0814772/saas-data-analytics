import { Body, Controller, Logger, Param, Post, UseGuards } from '@nestjs/common'
import { apiOk } from '../../shared/http/api-response'
import { CreateDatasourceDto as CreateDatasourceDtoClass } from './dto/create-datasource.dto'
import { WorkspaceGuard } from '../workspaces/guards/workspace.guard'
import { CurrentWorkspace } from '../../shared/decorators/current-workspace.decorator'
import type { WorkspaceContext } from '../../shared/types/workspace-context.type'
import { DatasourcesService } from './datasources.service'

@Controller('workspaces/datasources')
@UseGuards(WorkspaceGuard)
export class DatasourcesController {
  private readonly logger = new Logger(DatasourcesController.name)

  constructor(private readonly datasources: DatasourcesService) {}

  @Post()
  async create(@CurrentWorkspace() workspace: WorkspaceContext, @Body() dto: CreateDatasourceDtoClass) {
    this.logger.log(`datasources.create request workspaceId=${workspace.workspaceId}`)
    const data = await this.datasources.create({ workspaceId: workspace.workspaceId, dto })
    return apiOk(data)
  }

  @Post(':id/test-connection')
  async testConnection(
    @CurrentWorkspace() workspace: WorkspaceContext,
    @Param('id') datasourceId: string,
  ) {
    const data = await this.datasources.testConnection({ workspaceId: workspace.workspaceId, datasourceId })
    return apiOk(data)
  }

  @Post(':id/sample-query')
  async sampleQuery(
    @CurrentWorkspace() workspace: WorkspaceContext,
    @Param('id') datasourceId: string,
  ) {
    const data = await this.datasources.sampleQuery({ workspaceId: workspace.workspaceId, datasourceId })
    return apiOk(data)
  }

  @Post(':id/sync')
  async syncNow(
    @CurrentWorkspace() workspace: WorkspaceContext,
    @Param('id') datasourceId: string,
  ) {
    const data = await this.datasources.syncNow({ workspaceId: workspace.workspaceId, datasourceId })
    return apiOk(data)
  }
}

