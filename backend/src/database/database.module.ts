import { Logger, Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { join } from 'path'
import type { AppConfig } from '../shared/config/configuration'
import { RefreshToken } from '../modules/auth/entities/refresh-token.entity'
import { ApiKey } from '../modules/api-keys/entities/api-key.entity'
import { User } from '../modules/users/entities/user.entity'
import { WorkspaceInvite } from '../modules/workspaces/entities/workspace-invite.entity'
import { WorkspaceMember } from '../modules/workspaces/entities/workspace-member.entity'
import { Workspace } from '../modules/workspaces/entities/workspace.entity'
import { EventEntity } from '../modules/events/entities/event.entity'
import { EventIdempotencyKey } from '../modules/events/entities/event-idempotency-key.entity'
import { DailyEventAggregate } from '../modules/metrics/entities/daily-event-aggregate.entity'
import { DatasourceEntity } from '../modules/datasources/entities/datasource.entity'
import { WorkspaceDailyUsageEntity } from '../modules/cost/entities/workspace-daily-usage.entity'

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const logger = new Logger('TypeOrm')
        const db = config.get<AppConfig['database']>('app.database', { infer: true })
        const nodeEnv = config.get<AppConfig['nodeEnv']>('app.nodeEnv', { infer: true })
        if (!db) {
          throw new Error('Database configuration is missing')
        }
        logger.log(`db.connect host=${db.host} port=${db.port} database=${db.name} env=${nodeEnv}`)
        return {
          type: 'postgres' as const,
          host: db.host,
          port: db.port,
          username: db.user,
          password: db.password,
          database: db.name,
          entities: [
            User,
            RefreshToken,
            Workspace,
            WorkspaceMember,
            WorkspaceInvite,
            ApiKey,
            EventEntity,
            EventIdempotencyKey,
            DailyEventAggregate,
            DatasourceEntity,
            WorkspaceDailyUsageEntity,
          ],
          migrations: [join(__dirname, 'migrations', '*.js')],
          migrationsRun: true,
          synchronize: nodeEnv === 'development' && process.env.TYPEORM_SYNC === 'true',
        }
      },
    }),
  ],
})
export class DatabaseModule {}
