import { Body, Controller, Get, Logger, Post, UseGuards } from '@nestjs/common'
import { Throttle, ThrottlerGuard } from '@nestjs/throttler'
import { CurrentUser } from '../../shared/decorators/current-user.decorator'
import { Public } from '../../shared/decorators/public.decorator'
import { apiOk } from '../../shared/http/api-response'
import type { AuthUser } from '../../shared/types/auth-user.type'
import { AUTH_THROTTLE_TTL_MS } from './auth-throttle.constants'
import { AuthService } from './auth.service'
import { LoginDto } from './dto/login.dto'
import { LogoutDto } from './dto/logout.dto'
import { RefreshDto } from './dto/refresh.dto'
import { RegisterDto } from './dto/register.dto'

/**
 * HTTP layer for identity: register, login, tokens, logout, current user.
 * Throttling applies per IP (see Redis in production via REDIS_URL).
 * @Public skips the global JWT guard; other routes require Authorization: Bearer.
 */
@UseGuards(ThrottlerGuard)
@Throttle({
  default: {
    limit: 30,
    ttl: AUTH_THROTTLE_TTL_MS,
  },
})
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name)

  constructor(private readonly auth: AuthService) {}

  /** Create account + default workspace + return access/refresh tokens. */
  @Public()
  @Throttle({ default: { limit: 5, ttl: AUTH_THROTTLE_TTL_MS } })
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    this.logger.log(`auth.register request`)
    const data = await this.auth.register(dto)
    return apiOk(data)
  }

  /** Issue tokens when email/password match. */
  @Public()
  @Throttle({ default: { limit: 10, ttl: AUTH_THROTTLE_TTL_MS } })
  @Post('login')
  async login(@Body() dto: LoginDto) {
    this.logger.log(`auth.login request`)
    const data = await this.auth.login(dto)
    return apiOk(data)
  }

  /** Exchange a valid refresh token for a new access+refresh pair (rotation). */
  @Public()
  @Post('refresh')
  async refresh(@Body() dto: RefreshDto) {
    this.logger.log(`auth.refresh request`)
    const data = await this.auth.refresh(dto.refreshToken)
    return apiOk(data)
  }

  /** Revoke one refresh session; requires JWT and token must belong to the user. */
  @Post('logout')
  async logout(@CurrentUser() user: AuthUser, @Body() dto: LogoutDto) {
    this.logger.log(`auth.logout request userId=${user.userId}`)
    const data = await this.auth.logout(user, dto.refreshToken)
    return apiOk(data)
  }

  /** Profile for the authenticated user (from JWT). */
  @Throttle({ default: { limit: 120, ttl: AUTH_THROTTLE_TTL_MS } })
  @Get('me')
  async me(@CurrentUser() user: AuthUser) {
    this.logger.log(`auth.me request userId=${user.userId}`)
    const data = await this.auth.getMe(user)
    return apiOk(data)
  }
}
