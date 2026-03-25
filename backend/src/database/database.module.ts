import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { join } from 'path'
import type { AppConfig } from '../shared/config/configuration'
import { RefreshToken } from '../modules/auth/entities/refresh-token.entity'
import { User } from '../modules/users/entities/user.entity'

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const db = config.get<AppConfig['database']>('app.database', { infer: true })
        const nodeEnv = config.get<AppConfig['nodeEnv']>('app.nodeEnv', { infer: true })
        if (!db) {
          throw new Error('Database configuration is missing')
        }
        return {
          type: 'postgres' as const,
          host: db.host,
          port: db.port,
          username: db.user,
          password: db.password,
          database: db.name,
          entities: [User, RefreshToken],
          migrations: [join(__dirname, 'migrations', '*.js')],
          migrationsRun: true,
          synchronize: nodeEnv === 'development' && process.env.TYPEORM_SYNC === 'true',
        }
      },
    }),
  ],
})
export class DatabaseModule {}
