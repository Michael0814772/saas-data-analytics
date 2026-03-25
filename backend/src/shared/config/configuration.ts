import { registerAs } from '@nestjs/config'

export type AppConfig = {
  port: number
  nodeEnv: string
  database: {
    host: string
    port: number
    user: string
    password: string
    name: string
  }
  jwt: {
    accessSecret: string
    accessExpiresIn: string
    refreshExpiresIn: string
  }
}

export const configuration = registerAs(
  'app',
  (): AppConfig => ({
    port: parseInt(process.env.PORT ?? '3000', 10),
    nodeEnv: process.env.NODE_ENV ?? 'development',
    database: {
      host: process.env.DATABASE_HOST ?? 'localhost',
      port: parseInt(process.env.DATABASE_PORT ?? '5432', 10),
      user: process.env.DATABASE_USER ?? 'postgres',
      password: process.env.DATABASE_PASSWORD ?? 'postgres',
      name: process.env.DATABASE_NAME ?? 'analytics',
    },
    jwt: {
      accessSecret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret-change-me',
      accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
      refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
    },
  }),
)
