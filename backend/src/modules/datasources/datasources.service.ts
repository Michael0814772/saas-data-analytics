import { BadRequestException, ForbiddenException, Injectable, Logger } from '@nestjs/common'
import { DataSource } from 'typeorm'
import { Client } from 'pg'
import type { CreateDatasourceDto } from './dto/create-datasource.dto'
import { DATASOURCE_TYPE_POSTGRES } from './enums/datasource-type.enum'
import { DatasourceStatus } from './enums/datasource-status.enum'
import { DatasourcesRepository } from './datasources.repository'
import type { PostgresDatasourceConfigDto } from './dto/postgres-datasource-config.dto'

type TestConnectionResult = {
  ok: true
  serverVersion: string
  currentDatabase: string
}

type SampleQueryResult = {
  ok: true
  database: string
  user: string
  now: string
}

@Injectable()
export class DatasourcesService {
  private readonly logger = new Logger(DatasourcesService.name)

  constructor(
    private readonly dataSource: DataSource,
    private readonly repo: DatasourcesRepository,
  ) {}

  async create(params: { workspaceId: string; dto: CreateDatasourceDto }) {
    const cfg = params.dto.config

    // basic safety: never log secrets
    this.logger.log(`datasources.create workspaceId=${params.workspaceId} type=${params.dto.type}`)

    // For now: only Postgres is supported.
    if (params.dto.type !== DATASOURCE_TYPE_POSTGRES) {
      throw new BadRequestException({
        error: 'UNSUPPORTED_DATASOURCE_TYPE',
        message: `Unsupported datasource type=${params.dto.type}`,
      })
    }

    const created = await this.repo.create({
      workspaceId: params.workspaceId,
      type: params.dto.type,
      config: cfg as unknown as Record<string, unknown>,
      status: DatasourceStatus.DISCONNECTED,
    })

    return {
      id: created.id,
      workspaceId: created.workspaceId,
      type: created.type,
      status: created.status,
      lastSync: created.lastSync,
      createdAt: created.createdAt,
    }
  }

  private getPostgresConfig(cfg: Record<string, unknown>): PostgresDatasourceConfigDto {
    return cfg as unknown as PostgresDatasourceConfigDto
  }

  private async withPostgresClient(params: {
    cfg: PostgresDatasourceConfigDto
    timeoutMs: number
    query: (client: Client) => Promise<any>
  }): Promise<any> {
    const client = new Client({
      host: params.cfg.host,
      port: params.cfg.port,
      user: params.cfg.user,
      password: params.cfg.password,
      database: params.cfg.database,
      ssl: params.cfg.ssl ? { rejectUnauthorized: false } : undefined,
      connectionTimeoutMillis: params.timeoutMs,
    })

    await client.connect()
    try {
      return await params.query(client)
    } finally {
      await client.end().catch(() => {})
    }
  }

  async testConnection(params: { workspaceId: string; datasourceId: string }) {
    const row = await this.repo.findByWorkspaceAndId(params.workspaceId, params.datasourceId)
    if (!row) {
      throw new ForbiddenException({ error: 'DATASOURCE_NOT_FOUND', message: 'Datasource not found' })
    }
    if (row.type !== DATASOURCE_TYPE_POSTGRES) {
      throw new BadRequestException({
        error: 'UNSUPPORTED_DATASOURCE_TYPE',
        message: `Unsupported datasource type=${row.type}`,
      })
    }

    const startedAt = Date.now()
    const cfg = this.getPostgresConfig(row.config)

    try {
      const res = (await this.withPostgresClient({
        cfg,
        timeoutMs: 5000,
        query: async (client) => {
          const r1 = await client.query(`SELECT 1 as ok`)
          const r2 = await client.query(`SHOW server_version as version`)
          const r3 = await client.query(
            `SELECT current_database() as database`,
          )
          return {
            ok: true,
            serverVersion: r2.rows[0]?.version ?? 'unknown',
            currentDatabase: r3.rows[0]?.database ?? 'unknown',
            r1Ok: r1.rows[0]?.ok,
          }
        },
      })) as TestConnectionResult & { r1Ok: number }

      await this.repo.updateStatus({
        workspaceId: params.workspaceId,
        datasourceId: params.datasourceId,
        status: DatasourceStatus.CONNECTED,
      })

      this.logger.log(
        `datasources.testConnection success workspaceId=${params.workspaceId} datasourceId=${params.datasourceId} durationMs=${Date.now() - startedAt}`,
      )

      return {
        ok: true,
        serverVersion: res.serverVersion,
        currentDatabase: res.currentDatabase,
      }
    } catch (e) {
      await this.repo.updateStatus({
        workspaceId: params.workspaceId,
        datasourceId: params.datasourceId,
        status: DatasourceStatus.ERROR,
      })
      this.logger.warn(
        `datasources.testConnection failed workspaceId=${params.workspaceId} datasourceId=${params.datasourceId} error=${
          e instanceof Error ? e.message : 'unknown'
        }`,
      )
      throw new BadRequestException({
        error: 'CONNECTION_TEST_FAILED',
        message: e instanceof Error ? e.message : 'Connection test failed',
      })
    }
  }

  async sampleQuery(params: { workspaceId: string; datasourceId: string }) {
    const row = await this.repo.findByWorkspaceAndId(params.workspaceId, params.datasourceId)
    if (!row) {
      throw new ForbiddenException({ error: 'DATASOURCE_NOT_FOUND', message: 'Datasource not found' })
    }
    if (row.type !== DATASOURCE_TYPE_POSTGRES) {
      throw new BadRequestException({
        error: 'UNSUPPORTED_DATASOURCE_TYPE',
        message: `Unsupported datasource type=${row.type}`,
      })
    }

    const cfg = this.getPostgresConfig(row.config)
    const startedAt = Date.now()

    try {
      const res = (await this.withPostgresClient({
        cfg,
        timeoutMs: 5000,
        query: async (client) => {
          const r = await client.query(
            `SELECT current_database() as database, current_user as user, now() as now`,
          )
          const row0 = r.rows[0]
          return {
            ok: true,
            database: row0?.database ?? 'unknown',
            user: row0?.user ?? 'unknown',
            now: row0?.now ? String(row0.now) : new Date().toISOString(),
          } as SampleQueryResult
        },
      })) as SampleQueryResult

      this.logger.log(
        `datasources.sampleQuery success workspaceId=${params.workspaceId} datasourceId=${params.datasourceId} durationMs=${Date.now() - startedAt}`,
      )

      return res
    } catch (e) {
      await this.repo.updateStatus({
        workspaceId: params.workspaceId,
        datasourceId: params.datasourceId,
        status: DatasourceStatus.ERROR,
      })
      throw new BadRequestException({
        error: 'SAMPLE_QUERY_FAILED',
        message: e instanceof Error ? e.message : 'Sample query failed',
      })
    }
  }

  async syncNow(params: { workspaceId: string; datasourceId: string }) {
    // For Phase 1 we implement a minimal sync:
    // - validates connection (SELECT 1)
    // - marks datasource synced and updates lastSync
    const row = await this.repo.findByWorkspaceAndId(params.workspaceId, params.datasourceId)
    if (!row) {
      throw new ForbiddenException({ error: 'DATASOURCE_NOT_FOUND', message: 'Datasource not found' })
    }
    if (row.type !== DATASOURCE_TYPE_POSTGRES) {
      throw new BadRequestException({
        error: 'UNSUPPORTED_DATASOURCE_TYPE',
        message: `Unsupported datasource type=${row.type}`,
      })
    }

    const cfg = this.getPostgresConfig(row.config)

    await this.repo.updateStatus({
      workspaceId: params.workspaceId,
      datasourceId: params.datasourceId,
      status: DatasourceStatus.SYNCING,
    })

    try {
      await this.withPostgresClient({
        cfg,
        timeoutMs: 5000,
        query: async (client) => {
          await client.query(`SELECT 1 as ok`)
        },
      })

      const now = new Date()
      await this.repo.updateStatus({
        workspaceId: params.workspaceId,
        datasourceId: params.datasourceId,
        status: DatasourceStatus.SYNCED,
        lastSync: now,
      })

      return { ok: true, lastSync: now.toISOString() }
    } catch (e) {
      await this.repo.updateStatus({
        workspaceId: params.workspaceId,
        datasourceId: params.datasourceId,
        status: DatasourceStatus.ERROR,
      })
      throw new BadRequestException({
        error: 'SYNC_FAILED',
        message: e instanceof Error ? e.message : 'Sync failed',
      })
    }
  }
}

