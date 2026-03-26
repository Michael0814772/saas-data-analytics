import { LoggerService, LogLevel } from '@nestjs/common'
import { RequestContextStorage } from './request-context.storage'

type JsonPayload = {
  timestamp: string
  level: LogLevel | 'fatal'
  context: string
  message: string
  requestId: string | null
  correlationId: string | null
  trace?: string
}

export class JsonLogger implements LoggerService {
  constructor(private readonly defaultContext: string = 'app') {}

  log(message: unknown, context?: string): void {
    this.write('log', message, context)
  }

  error(message: unknown, trace?: string, context?: string): void {
    this.write('error', message, context, trace)
  }

  warn(message: unknown, context?: string): void {
    this.write('warn', message, context)
  }

  debug(message: unknown, context?: string): void {
    this.write('debug', message, context)
  }

  verbose(message: unknown, context?: string): void {
    this.write('verbose', message, context)
  }

  fatal(message: unknown, trace?: string, context?: string): void {
    this.write('fatal', message, context, trace)
  }

  private write(
    level: LogLevel | 'fatal',
    message: unknown,
    context?: string,
    trace?: string,
  ): void {
    const requestContext = RequestContextStorage.get()
    const payload: JsonPayload = {
      timestamp: new Date().toISOString(),
      level,
      context: context ?? this.defaultContext,
      message: this.stringifyMessage(message),
      requestId: requestContext?.requestId ?? null,
      correlationId: requestContext?.correlationId ?? null,
      ...(trace ? { trace } : {}),
    }

    const line = JSON.stringify(payload)
    if (level === 'error' || level === 'fatal' || level === 'warn') {
      process.stderr.write(`${line}\n`)
      return
    }
    process.stdout.write(`${line}\n`)
  }

  private stringifyMessage(message: unknown): string {
    if (typeof message === 'string') {
      return message
    }
    try {
      return JSON.stringify(message)
    } catch {
      return String(message)
    }
  }
}
