const getApiBaseUrl = (): string =>
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000'

export const publicEnv = {
  apiBaseUrl: getApiBaseUrl(),
} as const
