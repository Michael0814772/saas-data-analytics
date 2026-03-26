import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { DatabaseModule } from './database/database.module'
import { AuthModule } from './modules/auth/auth.module'
import { ApiKeysModule } from './modules/api-keys/api-keys.module'
import { WorkspacesModule } from './modules/workspaces/workspaces.module'
import { SharedConfigModule } from './shared/config/shared-config.module'
import { EventsModule } from './modules/events/events.module'
import { JobsModule } from './modules/jobs/jobs.module'
import { MetricsModule } from './modules/metrics/metrics.module'
import { DatasourcesModule } from './modules/datasources/datasources.module'
import { CostModule } from './modules/cost/cost.module'

@Module({
  imports: [
    SharedConfigModule,
    DatabaseModule,
    AuthModule,
    WorkspacesModule,
    ApiKeysModule,
    EventsModule,
    JobsModule,
    MetricsModule,
    DatasourcesModule,
    CostModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
