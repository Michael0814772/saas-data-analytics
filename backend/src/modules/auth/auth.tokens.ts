import { createHash, randomBytes } from 'crypto'

export const hashRefreshToken = (rawToken: string): string =>
  createHash('sha256').update(rawToken).digest('hex')

export const generateRawRefreshToken = (): string => randomBytes(48).toString('hex')

/** Parses short strings like 15m, 7d, 12h into milliseconds */
export const parseDurationToMs = (input: string): number => {
  const trimmed = input.trim()
  const match = /^(\d+)(ms|s|m|h|d)$/.exec(trimmed)
  if (!match) {
    return 7 * 24 * 60 * 60 * 1000
  }
  const value = parseInt(match[1], 10)
  const unit = match[2]
  const multipliers: Record<string, number> = {
    ms: 1,
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  }
  return value * (multipliers[unit] ?? 86_400_000)
}
