import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ApiKeysModule } from '../api-keys/api-keys.module'
import { CostModule } from '../cost/cost.module'
import { EventEntity } from './entities/event.entity'
import { EventIdempotencyKey } from './entities/event-idempotency-key.entity'
import { EventSchemaRegistryService } from './event-schema-registry.service'
import { EventsController } from './events.controller'
import { EventsRepository } from './events.repository'
import { EventsService } from './events.service'
import { EventIdempotencyKeysRepository } from './event-idempotency-keys.repository'

@Module({
  imports: [TypeOrmModule.forFeature([EventEntity, EventIdempotencyKey]), ApiKeysModule, CostModule],
  controllers: [EventsController],
  providers: [EventsRepository, EventsService, EventIdempotencyKeysRepository, EventSchemaRegistryService],
})
export class EventsModule {}

