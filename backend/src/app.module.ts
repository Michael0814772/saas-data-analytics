import { Module } from '@nestjs/common'
import { AppController } from './app.controller'
import { AppService } from './app.service'
import { DatabaseModule } from './database/database.module'
import { AuthModule } from './modules/auth/auth.module'
import { WorkspacesModule } from './modules/workspaces/workspaces.module'
import { SharedConfigModule } from './shared/config/shared-config.module'

@Module({
  imports: [SharedConfigModule, DatabaseModule, AuthModule, WorkspacesModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
