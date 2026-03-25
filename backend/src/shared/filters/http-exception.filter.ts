import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import type { Response } from 'express'
import type { ApiErrorBody } from '../http/api-response'

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()

    if (exception instanceof HttpException) {
      const status = exception.getStatus()
      const res = exception.getResponse()

      if (typeof res === 'object' && res !== null && 'success' in res) {
        response.status(status).json(res)
        return
      }

      if (typeof res === 'string') {
        const body: ApiErrorBody = {
          success: false,
          error: this.defaultErrorCode(status),
          message: res,
        }
        response.status(status).json(body)
        return
      }

      const payload = res as Record<string, unknown>
      const message = this.normalizeMessage(payload.message)
      const errorCode =
        typeof payload.error === 'string' ? payload.error : this.defaultErrorCode(status)

      const body: ApiErrorBody = {
        success: false,
        error: errorCode,
        message,
      }
      response.status(status).json(body)
      return
    }

    this.logger.error(
      exception instanceof Error ? exception.stack : String(exception),
    )
    const body: ApiErrorBody = {
      success: false,
      error: 'INTERNAL_ERROR',
      message: 'An unexpected error occurred',
    }
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json(body)
  }

  private normalizeMessage(message: unknown): string {
    if (Array.isArray(message)) {
      return message.map(String).join(', ')
    }
    if (typeof message === 'string') {
      return message
    }
    return 'Request failed'
  }

  private defaultErrorCode(status: number): string {
    if (status === HttpStatus.BAD_REQUEST) {
      return 'BAD_REQUEST'
    }
    if (status === HttpStatus.UNAUTHORIZED) {
      return 'UNAUTHORIZED'
    }
    if (status === HttpStatus.FORBIDDEN) {
      return 'FORBIDDEN'
    }
    if (status === HttpStatus.NOT_FOUND) {
      return 'NOT_FOUND'
    }
    if (status === HttpStatus.TOO_MANY_REQUESTS) {
      return 'RATE_LIMITED'
    }
    return 'HTTP_ERROR'
  }
}
