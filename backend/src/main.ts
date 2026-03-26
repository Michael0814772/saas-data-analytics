import { ValidationPipe } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { NestExpressApplication } from '@nestjs/platform-express'
import { randomUUID } from 'crypto'
import type { NextFunction, Request, Response } from 'express'
import { AppModule } from './app.module'
import type { AppConfig } from './shared/config/configuration'
import { HttpExceptionFilter } from './shared/filters/http-exception.filter'
import { JsonLogger } from './shared/logging/json.logger'
import { RequestContextStorage } from './shared/logging/request-context.storage'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  })
  const logger = new JsonLogger('bootstrap')
  app.useLogger(logger)
  const config = app.get(ConfigService)
  app.use((req: Request, res: Response, next: NextFunction) => {
    const requestIdHeader = req.headers['x-request-id']
    const correlationIdHeader = req.headers['x-correlation-id']
    const requestId =
      typeof requestIdHeader === 'string' && requestIdHeader.trim()
        ? requestIdHeader.trim()
        : randomUUID()
    const correlationId =
      typeof correlationIdHeader === 'string' && correlationIdHeader.trim()
        ? correlationIdHeader.trim()
        : requestId

    req.requestId = requestId
    req.correlationId = correlationId
    res.setHeader('x-request-id', requestId)
    res.setHeader('x-correlation-id', correlationId)

    RequestContextStorage.run({ requestId, correlationId }, () => next())
  })

  const trustHops = config.get<AppConfig['http']['trustProxyHops']>(
    'app.http.trustProxyHops',
    { infer: true },
  )
  if (trustHops !== null && trustHops !== undefined) {
    app.set('trust proxy', trustHops)
    logger.log(`http.trustProxy enabled hops=${trustHops}`)
  } else {
    logger.log(`http.trustProxy default`)
  }
  const redisUrl = config.get<AppConfig['redis']['url']>('app.redis.url', { infer: true })
  logger.log(`redis.url ${redisUrl ? 'configured' : 'not_configured'}`)
  app.enableShutdownHooks()
  app.setGlobalPrefix('v1')
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  app.useGlobalFilters(new HttpExceptionFilter())
  const port = config.get<AppConfig['port']>('app.port', { infer: true }) ?? 3000
  await app.listen(port)
  logger.log(`listening port=${port}`)
}
bootstrap()
