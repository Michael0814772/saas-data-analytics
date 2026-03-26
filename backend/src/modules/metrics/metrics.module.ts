import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { WorkspacesModule } from '../workspaces/workspaces.module'
import { DailyEventAggregate } from './entities/daily-event-aggregate.entity'
import { MetricsController } from './metrics.controller'
import { MetricsRepository } from './metrics.repository'
import { MetricsService } from './metrics.service'

@Module({
  imports: [TypeOrmModule.forFeature([DailyEventAggregate]), WorkspacesModule],
  controllers: [MetricsController],
  providers: [MetricsRepository, MetricsService],
  exports: [MetricsService],
})
export class MetricsModule {}

