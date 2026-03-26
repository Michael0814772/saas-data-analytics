import { randomUUID } from 'crypto'
import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import request from 'supertest'
import { App } from 'supertest/types'
import { AppModule } from '../src/app.module'
import { HttpExceptionFilter } from '../src/shared/filters/http-exception.filter'

/**
 * Requires PostgreSQL (same as `docker compose up postgres`) and env matching `backend/.env`.
 */
describe('Workspaces — x-workspace-id (e2e)', () => {
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

  it('register creates default workspace; context enforces header and membership', async () => {
    const email = `e2e_${randomUUID()}@test.local`
    const password = 'password12ok'

    const reg = await request(app.getHttpServer())
      .post('/v1/auth/register')
      .send({ email, password })
      .expect(201)

    expect(reg.body.success).toBe(true)
    const accessToken = reg.body.data.accessToken as string
    expect(accessToken).toBeTruthy()

    const list = await request(app.getHttpServer())
      .get('/v1/workspaces')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)

    expect(list.body.success).toBe(true)
    expect(Array.isArray(list.body.data)).toBe(true)
    expect(list.body.data.length).toBeGreaterThanOrEqual(1)
    const workspaceId = list.body.data[0].id as string

    await request(app.getHttpServer())
      .get('/v1/workspaces/context')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(400)
      .expect((res) => {
        expect(res.body.success).toBe(false)
        expect(res.body.error).toBe('WORKSPACE_REQUIRED')
      })

    await request(app.getHttpServer())
      .get('/v1/workspaces/context')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-workspace-id', 'not-a-uuid')
      .expect(400)
      .expect((res) => {
        expect(res.body.error).toBe('INVALID_WORKSPACE_ID')
      })

    const foreignId = '00000000-0000-4000-8000-000000000099'
    await request(app.getHttpServer())
      .get('/v1/workspaces/context')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-workspace-id', foreignId)
      .expect(403)
      .expect((res) => {
        expect(res.body.error).toBe('WORKSPACE_FORBIDDEN')
      })

    await request(app.getHttpServer())
      .get('/v1/workspaces/context')
      .set('Authorization', `Bearer ${accessToken}`)
      .set('x-workspace-id', workspaceId)
      .expect(200)
      .expect((res) => {
        expect(res.body.success).toBe(true)
        expect(res.body.data.id).toBe(workspaceId)
        expect(res.body.data.role).toBe('owner')
      })
  })
})
