import { Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { ConfigService } from '@nestjs/config'
import { ThrottlerModule } from '@nestjs/throttler'
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis'
import { TypeOrmModule } from '@nestjs/typeorm'
import type { AppConfig } from '../../shared/config/configuration'
import { UsersModule } from '../users/users.module'
import { WorkspacesModule } from '../workspaces/workspaces.module'
import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { RefreshToken } from './entities/refresh-token.entity'
import { JwtAuthGuard } from './guards/jwt-auth.guard'
import { RefreshTokenRepository } from './refresh-token.repository'
import { AUTH_THROTTLE_MODULE_LIMIT, AUTH_THROTTLE_TTL_MS } from './auth-throttle.constants'
import { JwtStrategy } from './strategies/jwt.strategy'

@Module({
  imports: [
    UsersModule,
    WorkspacesModule,
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cfg: ConfigService) => {
        const redisUrl = cfg.get<AppConfig['redis']['url']>('app.redis.url', { infer: true })
        const throttlers = [
          {
            ttl: AUTH_THROTTLE_TTL_MS,
            limit: AUTH_THROTTLE_MODULE_LIMIT,
          },
        ]
        if (redisUrl) {
          return {
            throttlers,
            storage: new ThrottlerStorageRedisService(redisUrl),
          }
        }
        return { throttlers }
      },
    }),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    TypeOrmModule.forFeature([RefreshToken]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const jwt = config.get<AppConfig['jwt']>('app.jwt', { infer: true })
        if (!jwt) {
          throw new Error('JWT configuration is missing')
        }
        return {
          secret: jwt.accessSecret,
          signOptions: {
            expiresIn: jwt.accessExpiresIn,
          },
        }
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    RefreshTokenRepository,
    JwtAuthGuard,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
  exports: [AuthService],
})
export class AuthModule {}
