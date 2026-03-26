import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { WorkspacesModule } from '../workspaces/workspaces.module'
import { DatasourceEntity } from './entities/datasource.entity'
import { DatasourcesRepository } from './datasources.repository'
import { DatasourcesService } from './datasources.service'
import { DatasourcesController } from './datasources.controller'

@Module({
  imports: [TypeOrmModule.forFeature([DatasourceEntity]), WorkspacesModule],
  controllers: [DatasourcesController],
  providers: [DatasourcesRepository, DatasourcesService],
})
export class DatasourcesModule {}

