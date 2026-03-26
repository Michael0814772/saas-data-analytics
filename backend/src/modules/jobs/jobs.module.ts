import { Module } from '@nestjs/common'
import { JobsService } from './jobs.service'
import { ExpiredIdempotencyKeysCleanupProcessor } from './cleanup/expired-idempotency-keys.processor'

@Module({
  providers: [JobsService, ExpiredIdempotencyKeysCleanupProcessor],
})
export class JobsModule {}

