import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ApiKeysController } from './api-keys.controller'
import { ApiKeysRepository } from './api-keys.repository'
import { ApiKeysService } from './api-keys.service'
import { ApiKey } from './entities/api-key.entity'
import { ApiKeyGuard } from './guards/api-key.guard'
import { WorkspacesModule } from '../workspaces/workspaces.module'

@Module({
  imports: [TypeOrmModule.forFeature([ApiKey]), WorkspacesModule],
  controllers: [ApiKeysController],
  providers: [ApiKeysRepository, ApiKeysService, ApiKeyGuard],
  exports: [ApiKeysService, ApiKeyGuard],
})
export class ApiKeysModule {}
