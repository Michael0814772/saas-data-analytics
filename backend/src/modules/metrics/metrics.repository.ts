import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { DailyEventAggregate } from './entities/daily-event-aggregate.entity'

@Injectable()
export class MetricsRepository {
  private readonly logger = new Logger(MetricsRepository.name)

  constructor(
    @InjectRepository(DailyEventAggregate)
    private readonly repo: Repository<DailyEventAggregate>,
  ) {}

  async sumCounts(params: {
    workspaceId: string
    fromDate: string
    toDate: string
    eventName?: string
  }): Promise<{ totalEvents: number }> {
    const qb = this.repo
      .createQueryBuilder('a')
      .select('COALESCE(SUM(a.count), 0)', 'totalEvents')
      .where('a.workspace_id = :workspaceId', { workspaceId: params.workspaceId })
      .andWhere('a.date >= :fromDate', { fromDate: params.fromDate })
      .andWhere('a.date <= :toDate', { toDate: params.toDate })

    if (params.eventName) {
      qb.andWhere('a.event_name = :eventName', { eventName: params.eventName })
    }

    const row = (await qb.getRawOne()) as { totalEvents: string | number } | undefined
    const totalEvents = row ? Number(row.totalEvents) : 0
    return { totalEvents: Number.isFinite(totalEvents) ? totalEvents : 0 }
  }

  async dailyUsage(params: {
    workspaceId: string
    fromDate: string
    toDate: string
    eventName?: string
    limit: number
    offset: number
  }): Promise<{
    rows: Array<{ date: string; events: number; uniqueUsers: number }>
    totalRows: number
  }> {
    const base = this.repo
      .createQueryBuilder('a')
      .where('a.workspace_id = :workspaceId', { workspaceId: params.workspaceId })
      .andWhere('a.date >= :fromDate', { fromDate: params.fromDate })
      .andWhere('a.date <= :toDate', { toDate: params.toDate })

    if (params.eventName) {
      base.andWhere('a.event_name = :eventName', { eventName: params.eventName })
    }

    const countQb = base.clone().select('COUNT(DISTINCT a.date)', 'cnt')
    const totalRaw = (await countQb.getRawOne()) as { cnt: string | number } | undefined
    const totalRows = totalRaw ? Number(totalRaw.cnt) : 0

    // Aggregate by date (summing counts / uniqueUsers across eventNames if eventName filter omitted)
    const dataQb = base
      .clone()
      .select('a.date', 'date')
      .addSelect('SUM(a.count)', 'events')
      .addSelect('SUM(a.unique_users)', 'uniqueUsers')
      .groupBy('a.date')
      .orderBy('a.date', 'ASC')
      .offset(params.offset)
      .limit(params.limit)

    const raw = (await dataQb.getRawMany()) as Array<{
      date: string
      events: string
      uniqueUsers: string
    }>

    return {
      rows: raw.map((r) => ({
        date: r.date,
        events: Number(r.events) || 0,
        uniqueUsers: Number(r.uniqueUsers) || 0,
      })),
      totalRows: Number.isFinite(totalRows) ? totalRows : 0,
    }
  }

  async sumUniqueUsers(params: {
    workspaceId: string
    fromDate: string
    toDate: string
    eventName?: string
  }): Promise<{ activeUsers: number }> {
    const qb = this.repo
      .createQueryBuilder('a')
      .select('COALESCE(SUM(a.uniqueUsers), 0)', 'activeUsers')
      .where('a.workspace_id = :workspaceId', { workspaceId: params.workspaceId })
      .andWhere('a.date >= :fromDate', { fromDate: params.fromDate })
      .andWhere('a.date <= :toDate', { toDate: params.toDate })

    if (params.eventName) {
      qb.andWhere('a.event_name = :eventName', { eventName: params.eventName })
    }

    const row = (await qb.getRawOne()) as { activeUsers: string | number } | undefined
    const activeUsers = row ? Number(row.activeUsers) : 0
    return { activeUsers: Number.isFinite(activeUsers) ? activeUsers : 0 }
  }
}

