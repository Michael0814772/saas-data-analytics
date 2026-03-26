import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { WorkspaceDailyUsageEntity } from './entities/workspace-daily-usage.entity'
import { CostRepository } from './cost.repository'

@Module({
  imports: [TypeOrmModule.forFeature([WorkspaceDailyUsageEntity])],
  providers: [CostRepository],
  exports: [CostRepository],
})
export class CostModule {}

