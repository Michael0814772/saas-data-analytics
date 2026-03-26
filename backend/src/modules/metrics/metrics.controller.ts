import { Controller, Get, Logger, Query, UseGuards } from '@nestjs/common'
import { Throttle, ThrottlerGuard } from '@nestjs/throttler'
import { apiOk } from '../../shared/http/api-response'
import { CurrentWorkspace } from '../../shared/decorators/current-workspace.decorator'
import type { WorkspaceContext } from '../../shared/types/workspace-context.type'
import { WorkspaceGuard } from '../workspaces/guards/workspace.guard'
import { MetricsService } from './metrics.service'

const METRICS_TTL_MS = 60_000

@Controller('metrics')
@UseGuards(ThrottlerGuard, WorkspaceGuard)
@Throttle({ default: { limit: 120, ttl: METRICS_TTL_MS } })
export class MetricsController {
  private readonly logger = new Logger(MetricsController.name)

  constructor(private readonly metrics: MetricsService) {}

  @Get('events')
  async totalEvents(
    @CurrentWorkspace() workspace: WorkspaceContext,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
    @Query('eventName') eventName?: string,
  ) {
    this.logger.log(`metrics.events request workspaceId=${workspace.workspaceId}`)
    const data = await this.metrics.totalEvents({
      workspaceId: workspace.workspaceId,
      fromDate,
      toDate,
      eventName,
    })
    return apiOk(data)
  }

  @Get('active-users')
  async activeUsers(
    @CurrentWorkspace() workspace: WorkspaceContext,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
    @Query('eventName') eventName?: string,
  ) {
    this.logger.log(`metrics.active_users request workspaceId=${workspace.workspaceId}`)
    const data = await this.metrics.activeUsers({
      workspaceId: workspace.workspaceId,
      fromDate,
      toDate,
      eventName,
    })
    return apiOk(data)
  }

  @Get('growth')
  async growth(
    @CurrentWorkspace() workspace: WorkspaceContext,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
    @Query('eventName') eventName?: string,
  ) {
    this.logger.log(`metrics.growth request workspaceId=${workspace.workspaceId}`)
    const data = await this.metrics.growthRate({
      workspaceId: workspace.workspaceId,
      fromDate,
      toDate,
      eventName,
    })
    return apiOk(data)
  }

  @Get('daily')
  async daily(
    @CurrentWorkspace() workspace: WorkspaceContext,
    @Query('fromDate') fromDate: string,
    @Query('toDate') toDate: string,
    @Query('eventName') eventName?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    this.logger.log(`metrics.daily request workspaceId=${workspace.workspaceId}`)
    const data = await this.metrics.dailyUsage({
      workspaceId: workspace.workspaceId,
      fromDate,
      toDate,
      eventName,
      limit: limit !== undefined ? Number(limit) : undefined,
      offset: offset !== undefined ? Number(offset) : undefined,
    })
    return apiOk(data)
  }
}

