import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import request from 'supertest'
import { App } from 'supertest/types'
import { AppModule } from './../src/app.module'
import { HttpExceptionFilter } from './../src/shared/filters/http-exception.filter'

describe('AppController (e2e)', () => {
  let app: INestApplication<App>

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()
    app.setGlobalPrefix('v1')
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    )
    app.useGlobalFilters(new HttpExceptionFilter())
    await app.init()
  })

  afterEach(async () => {
    await app.close()
  })

  it('GET /v1 returns hello', () => {
    return request(app.getHttpServer())
      .get('/v1')
      .expect(200)
      .expect((res) => {
        expect(res.body.success).toBe(true)
        expect(res.body.data.message).toBe('Hello World!')
      })
  })

  it('GET /v1/health returns ok', () => {
    return request(app.getHttpServer())
      .get('/v1/health')
      .expect(200)
      .expect((res) => {
        expect(res.body.success).toBe(true)
        expect(res.body.data.status).toBe('ok')
      })
  })
})
