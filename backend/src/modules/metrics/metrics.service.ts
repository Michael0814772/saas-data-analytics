import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { MetricsRepository } from './metrics.repository'

const DEFAULT_LIMIT = 30
const MAX_LIMIT = 365
const MAX_RANGE_DAYS = 366

type GrowthResult = {
  fromDate: string
  toDate: string
  currentTotalEvents: number
  previousFromDate: string
  previousToDate: string
  previousTotalEvents: number
  growthRate: number | null
}

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name)

  constructor(private readonly metrics: MetricsRepository) {}

  async totalEvents(params: { workspaceId: string; fromDate: string; toDate: string; eventName?: string }) {
    const { fromDate, toDate } = this.validateRange(params.fromDate, params.toDate)
    return this.metrics.sumCounts({
      workspaceId: params.workspaceId,
      fromDate,
      toDate,
      eventName: params.eventName,
    })
  }

  async dailyUsage(params: {
    workspaceId: string
    fromDate: string
    toDate: string
    eventName?: string
    limit?: number
    offset?: number
  }) {
    const { fromDate, toDate } = this.validateRange(params.fromDate, params.toDate)
    const limit = this.clampInt(params.limit ?? DEFAULT_LIMIT, 1, MAX_LIMIT)
    const offset = Math.max(0, Math.floor(params.offset ?? 0))

    return this.metrics.dailyUsage({
      workspaceId: params.workspaceId,
      fromDate,
      toDate,
      eventName: params.eventName,
      limit,
      offset,
    })
  }

  async growthRate(params: { workspaceId: string; fromDate: string; toDate: string; eventName?: string }): Promise<GrowthResult> {
    const { fromDate, toDate, days } = this.validateRange(params.fromDate, params.toDate)
    const current = await this.metrics.sumCounts({
      workspaceId: params.workspaceId,
      fromDate,
      toDate,
      eventName: params.eventName,
    })

    const prevTo = this.addDays(fromDate, -1)
    const prevFrom = this.addDays(prevTo, -(days - 1))

    const previous = await this.metrics.sumCounts({
      workspaceId: params.workspaceId,
      fromDate: prevFrom,
      toDate: prevTo,
      eventName: params.eventName,
    })

    const prev = previous.totalEvents
    const curr = current.totalEvents
    const growthRate = prev > 0 ? (curr - prev) / prev : null

    return {
      fromDate,
      toDate,
      currentTotalEvents: curr,
      previousFromDate: prevFrom,
      previousToDate: prevTo,
      previousTotalEvents: prev,
      growthRate,
    }
  }

  async activeUsers(params: { workspaceId: string; fromDate: string; toDate: string; eventName?: string }) {
    const { fromDate, toDate } = this.validateRange(params.fromDate, params.toDate)
    return this.metrics.sumUniqueUsers({
      workspaceId: params.workspaceId,
      fromDate,
      toDate,
      eventName: params.eventName,
    })
  }

  private validateRange(fromDateRaw: string, toDateRaw: string): { fromDate: string; toDate: string; days: number } {
    const fromDate = this.normalizeDate(fromDateRaw, 'fromDate')
    const toDate = this.normalizeDate(toDateRaw, 'toDate')

    if (fromDate > toDate) {
      throw new BadRequestException({
        error: 'INVALID_DATE_RANGE',
        message: 'fromDate must be <= toDate',
      })
    }

    const days = this.diffDays(fromDate, toDate) + 1
    if (days > MAX_RANGE_DAYS) {
      throw new BadRequestException({
        error: 'DATE_RANGE_TOO_LARGE',
        message: `Max range is ${MAX_RANGE_DAYS} days`,
      })
    }

    return { fromDate, toDate, days }
  }

  private normalizeDate(raw: string, field: string): string {
    if (typeof raw !== 'string' || !raw.trim()) {
      throw new BadRequestException({
        error: 'INVALID_DATE',
        message: `${field} is required (YYYY-MM-DD)`,
      })
    }
    const v = raw.trim()
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      throw new BadRequestException({
        error: 'INVALID_DATE',
        message: `${field} must be YYYY-MM-DD`,
      })
    }
    const d = new Date(`${v}T00:00:00.000Z`)
    if (Number.isNaN(d.getTime())) {
      throw new BadRequestException({
        error: 'INVALID_DATE',
        message: `${field} is not a valid date`,
      })
    }
    return v
  }

  private diffDays(fromDate: string, toDate: string): number {
    const from = new Date(`${fromDate}T00:00:00.000Z`).getTime()
    const to = new Date(`${toDate}T00:00:00.000Z`).getTime()
    return Math.floor((to - from) / (24 * 60 * 60 * 1000))
  }

  private addDays(date: string, days: number): string {
    const d = new Date(`${date}T00:00:00.000Z`)
    d.setUTCDate(d.getUTCDate() + days)
    return d.toISOString().slice(0, 10)
  }

  private clampInt(v: number, min: number, max: number): number {
    const n = Math.floor(v)
    if (!Number.isFinite(n)) {
      return min
    }
    if (n < min) {
      return min
    }
    if (n > max) {
      return max
    }
    return n
  }
}

