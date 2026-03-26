import { createHash, randomBytes } from 'crypto'

export const hashInviteToken = (raw: string): string =>
  createHash('sha256').update(raw).digest('hex')

export const generateInviteToken = (): string => randomBytes(32).toString('hex')
