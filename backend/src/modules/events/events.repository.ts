import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { In, Repository } from 'typeorm'
import type { EntityManager } from 'typeorm'
import { EventEntity } from './entities/event.entity'

@Injectable()
export class EventsRepository {
  private readonly logger = new Logger(EventsRepository.name)

  constructor(
    @InjectRepository(EventEntity)
    private readonly repo: Repository<EventEntity>,
  ) {}

  async findExistingByIdempotencyKeys(params: {
    workspaceId: string
    idempotencyKeys: string[]
  }): Promise<Set<string>> {
    if (params.idempotencyKeys.length === 0) {
      return new Set()
    }
    this.logger.debug(
      `events.repo.findExisting workspaceId=${params.workspaceId} keys=${params.idempotencyKeys.length}`,
    )
    const rows = await this.repo.find({
      where: {
        workspaceId: params.workspaceId,
        idempotencyKey: In(params.idempotencyKeys),
      },
      select: ['idempotencyKey'],
    })
    return new Set(rows.map((r) => r.idempotencyKey))
  }

  async bulkInsert(values: Array<Omit<EventEntity, 'id' | 'createdAt'>>, manager?: EntityManager): Promise<void> {
    if (values.length === 0) {
      return
    }
    this.logger.debug(`events.repo.bulkInsert count=${values.length}`)
    const targetRepo = manager?.getRepository(EventEntity) ?? this.repo
    // TypeORM's generic insert types don't like jsonb `properties` in strict mode.
    // Safe here because the values are shaped to match the EventEntity columns.
    await targetRepo.insert(values as any)
  }
}

