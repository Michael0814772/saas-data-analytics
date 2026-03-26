import { Controller, Get, Logger, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { AppConfig } from './shared/config/configuration'
import { AppService } from './app.service'
import { Public } from './shared/decorators/public.decorator'
import { apiOk } from './shared/http/api-response'
import Redis from 'ioredis'

/** Root routes: smoke test and health checks (no tenant, no auth). */
@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name)

  constructor(
    private readonly appService: AppService,
    private readonly config: ConfigService,
  ) {}

  /** Simple JSON payload to verify the API is up. */
  @Public()
  @Get()
  getHello() {
    this.logger.debug(`app.hello request`)
    return apiOk({ message: this.appService.getHello() })
  }

  /** Liveness probe for load balancers / k8s. */
  @Public()
  @Get('health')
  getHealth() {
    this.logger.debug(`app.health request`)
    return apiOk({ status: 'ok' })
  }

  /** Liveness probe: process is up (no external deps). */
  @Public()
  @Get('health/live')
  getLive() {
    this.logger.debug(`app.health_live request`)
    return apiOk({ status: 'ok' })
  }

  /** Readiness probe: DB (and Redis if configured) reachable. */
  @Public()
  @Get('health/ready')
  async getReady() {
    this.logger.debug(`app.health_ready request`)
    const dbOk = await this.appService.dbReady()

    const redisUrl = this.config.get<AppConfig['redis']['url']>('app.redis.url', { infer: true })
    let redisOk = true
    if (redisUrl) {
      const client = new Redis(redisUrl, { maxRetriesPerRequest: 1 })
      try {
        const pong = await client.ping()
        redisOk = pong === 'PONG'
      } catch {
        redisOk = false
      } finally {
        try {
          client.disconnect()
        } catch {}
      }
    }

    if (!dbOk || !redisOk) {
      throw new ServiceUnavailableException({
        error: 'NOT_READY',
        message: 'Service dependencies are not ready',
      })
    }

    return apiOk({
      status: 'ok',
      dependencies: {
        database: dbOk ? 'ok' : 'down',
        redis: redisUrl ? (redisOk ? 'ok' : 'down') : 'not_configured',
      },
    })
  }
}
