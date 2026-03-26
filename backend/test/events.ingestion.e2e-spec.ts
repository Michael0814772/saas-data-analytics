import { randomUUID } from 'crypto'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import request from 'supertest'
import { App } from 'supertest/types'
import { AppModule } from '../src/app.module'
import { HttpExceptionFilter } from '../src/shared/filters/http-exception.filter'

describe('Events ingestion — contract (x-api-key, x-idempotency-key)', () => {
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

  it('ingests a single event and dedupes on x-idempotency-key retry', async () => {
    const email = `e2e_${randomUUID()}@test.local`
    const password = 'password12ok'

    const reg = await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({ email, password })
      .expect(201)

    const accessToken = reg.body.data.accessToken as string

    const workspaces = await request(app.getHttpServer())
      .get('/v1/workspaces')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)

    const workspaceId = workspaces.body.data[0].id as string

    const apiKeyRes = await request(app.getHttpServer())
      .post('/v1/workspaces/api-keys')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-workspace-id', workspaceId)
      .send({
        name: 'test-key',
        permissions: ['events:ingest'],
        sourceId: 'default_datasource',
      })
      .expect(201)

    expect(apiKeyRes.body.success).toBe(true)
    const rawApiKey = apiKeyRes.body.data.key as string | undefined
    expect(typeof rawApiKey).toBe('string')
    expect(rawApiKey?.startsWith('sak_')).toBe(true)
    const idempotencyKey = `idem_${randomUUID()}`

    const event = {
      eventName: 'user_signup',
      properties: { email, created: true },
      timestamp: new Date().toISOString(),
    }

    const first = await request(app.getHttpServer())
      .post('/v1/events')
      .set('x-api-key', rawApiKey)
      .set('x-idempotency-key', idempotencyKey)
      .send(event)
      .expect(201)

    expect(first.body.success).toBe(true)
    expect(first.body.data.inserted).toBe(1)
    expect(first.body.data.deduped).toBe(0)

    const second = await request(app.getHttpServer())
      .post('/v1/events')
      .set('x-api-key', rawApiKey)
      .set('x-idempotency-key', idempotencyKey)
      .send(event)
      .expect(201)

    expect(second.body.success).toBe(true)
    expect(second.body.data.inserted).toBe(0)
    expect(second.body.data.deduped).toBe(1)
  })

  it('rejects invalid eventName', async () => {
    const email = `e2e_${randomUUID()}@test.local`
    const password = 'password12ok'

    const reg = await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({ email, password })
      .expect(201)

    const accessToken = reg.body.data.accessToken as string
    const workspaces = await request(app.getHttpServer())
      .get('/v1/workspaces')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)

    const workspaceId = workspaces.body.data[0].id as string

    const apiKeyRes = await request(app.getHttpServer())
      .post('/v1/workspaces/api-keys')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-workspace-id', workspaceId)
      .send({
        name: 'test-key',
        permissions: ['events:ingest'],
        sourceId: 'default_datasource',
      })
      .expect(201)

    const rawApiKey = apiKeyRes.body.data.key as string
    const idempotencyKey = `idem_${randomUUID()}`

    await request(app.getHttpServer())
      .post('/v1/events')
      .set('x-api-key', rawApiKey)
      .set('x-idempotency-key', idempotencyKey)
      .send({ eventName: '', properties: { a: 1 } })
      .expect(400)
      .expect((res) => {
        expect(res.body.success).toBe(false)
        expect(res.body.error).toBe('INVALID_EVENT_NAME')
      })
  })
})

