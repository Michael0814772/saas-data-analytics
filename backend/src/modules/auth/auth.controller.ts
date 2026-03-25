import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common'
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

@UseGuards(ThrottlerGuard)
@Throttle({
  default: {
    limit: 30,
    ttl: AUTH_THROTTLE_TTL_MS,
  },
})
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 5, ttl: AUTH_THROTTLE_TTL_MS } })
  @Post('register')
  async register(@Body() dto: RegisterDto) {
    const data = await this.auth.register(dto)
    return apiOk(data)
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: AUTH_THROTTLE_TTL_MS } })
  @Post('login')
  async login(@Body() dto: LoginDto) {
    const data = await this.auth.login(dto)
    return apiOk(data)
  }

  @Public()
  @Post('refresh')
  async refresh(@Body() dto: RefreshDto) {
    const data = await this.auth.refresh(dto.refreshToken)
    return apiOk(data)
  }

  @Post('logout')
  async logout(@CurrentUser() user: AuthUser, @Body() dto: LogoutDto) {
    const data = await this.auth.logout(user, dto.refreshToken)
    return apiOk(data)
  }

  @Throttle({ default: { limit: 120, ttl: AUTH_THROTTLE_TTL_MS } })
  @Get('me')
  async me(@CurrentUser() user: AuthUser) {
    const data = await this.auth.getMe(user)
    return apiOk(data)
  }
}
