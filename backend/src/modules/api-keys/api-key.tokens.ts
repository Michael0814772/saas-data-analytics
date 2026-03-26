import { createHash, randomBytes } from 'crypto'

const API_KEY_PREFIX = 'sak'

export const hashApiKey = (rawApiKey: string): string =>
  createHash('sha256').update(rawApiKey).digest('hex')

export const generateRawApiKey = (): string => {
  const body = randomBytes(32).toString('hex')
  return `${API_KEY_PREFIX}_${body}`
}

export const toApiKeyPrefix = (rawApiKey: string): string => rawApiKey.slice(0, 16)
