import { ConfigService } from '@nestjs/config'
import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import type { AppConfig } from './shared/config/configuration'
import { HttpExceptionFilter } from './shared/filters/http-exception.filter'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.setGlobalPrefix('v1')
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  app.useGlobalFilters(new HttpExceptionFilter())
  const config = app.get(ConfigService)
  const port = config.get<AppConfig['port']>('app.port', { infer: true }) ?? 3000
  await app.listen(port)
}
bootstrap()
