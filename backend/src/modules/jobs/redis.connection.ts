import { Logger } from '@nestjs/common'
import Redis from 'ioredis'

export const createRedisConnection = (redisUrl: string) => {
  const logger = new Logger('BullMQ')
  const connection = new Redis(redisUrl, {
    // BullMQ recommends disabling maxRetriesPerRequest so blocking commands don't error.
    maxRetriesPerRequest: null,
  })

  connection.on('connect', () => logger.log('redis.connect success'))
  connection.on('error', (err) => logger.error(`redis.connect error=${err?.message ?? 'unknown'}`))
  return connection
}

