import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import type { EntityManager } from 'typeorm'
import { WorkspaceDailyUsageEntity } from './entities/workspace-daily-usage.entity'

@Injectable()
export class CostRepository {
  private readonly logger = new Logger(CostRepository.name)

  constructor(
    @InjectRepository(WorkspaceDailyUsageEntity)
    private readonly repo: Repository<WorkspaceDailyUsageEntity>,
  ) {}

  async getForDay(params: {
    manager?: EntityManager
    workspaceId: string
    date: string
  }): Promise<{ eventsInserted: number; bytesReceived: bigint }> {
    const target = params.manager ? params.manager.getRepository(WorkspaceDailyUsageEntity) : this.repo
    const row = await target.findOne({ where: { workspaceId: params.workspaceId, date: params.date } })
    return {
      eventsInserted: row?.eventsInserted ?? 0,
      bytesReceived: BigInt(row?.bytesReceived ?? '0'),
    }
  }

  async incrementForDay(params: {
    manager: EntityManager
    workspaceId: string
    date: string
    eventsInserted: number
    bytesReceived: number
  }): Promise<void> {
    await params.manager.query(
      `
      INSERT INTO workspace_daily_usage (workspace_id, date, events_inserted, bytes_received, created_at, updated_at)
      VALUES ($1, $2::date, $3, $4, now(), now())
      ON CONFLICT (workspace_id, date)
      DO UPDATE SET
        events_inserted = workspace_daily_usage.events_inserted + EXCLUDED.events_inserted,
        bytes_received = workspace_daily_usage.bytes_received + EXCLUDED.bytes_received,
        updated_at = now()
      `,
      [params.workspaceId, params.date, params.eventsInserted, params.bytesReceived],
    )
  }
}

