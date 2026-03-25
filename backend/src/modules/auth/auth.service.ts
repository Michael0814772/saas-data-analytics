import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'
import type { AppConfig } from '../../shared/config/configuration'
import type { AuthUser } from '../../shared/types/auth-user.type'
import { User } from '../users/entities/user.entity'
import { UsersService } from '../users/users.service'
import {
  generateRawRefreshToken,
  hashRefreshToken,
  parseDurationToMs,
} from './auth.tokens'
import type { LoginDto } from './dto/login.dto'
import type { RegisterDto } from './dto/register.dto'
import { RefreshTokenRepository } from './refresh-token.repository'

export type AuthTokens = {
  accessToken: string
  refreshToken: string
  accessExpiresIn: string
}

@Injectable()
export class AuthService {
  private readonly accessExpiresIn: string
  private readonly refreshExpiresIn: string

  constructor(
    private readonly config: ConfigService,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly refreshTokens: RefreshTokenRepository,
  ) {
    const jwt = this.config.get<AppConfig['jwt']>('app.jwt', { infer: true })
    if (!jwt) {
      throw new Error('JWT configuration is missing')
    }
    this.accessExpiresIn = jwt.accessExpiresIn
    this.refreshExpiresIn = jwt.refreshExpiresIn
  }

  async register(dto: RegisterDto): Promise<{
    user: { id: string; email: string }
  } & AuthTokens> {
    const existing = await this.usersService.findByEmail(dto.email)
    if (existing) {
      throw new ConflictException({
        error: 'EMAIL_TAKEN',
        message: 'An account with this email already exists',
      })
    }
    const passwordHash = await bcrypt.hash(dto.password, 12)
    const user = await this.usersService.create(dto.email, passwordHash)
    const tokens = await this.issueTokenPair(user)
    return {
      user: { id: user.id, email: user.email },
      ...tokens,
    }
  }

  async login(dto: LoginDto): Promise<{
    user: { id: string; email: string }
  } & AuthTokens> {
    const user = await this.usersService.findByEmail(dto.email)
    if (!user) {
      throw new UnauthorizedException({
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      })
    }
    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash)
    if (!passwordValid) {
      throw new UnauthorizedException({
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      })
    }
    const tokens = await this.issueTokenPair(user)
    return {
      user: { id: user.id, email: user.email },
      ...tokens,
    }
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const hash = hashRefreshToken(refreshToken)
    const record = await this.refreshTokens.findByHashWithUser(hash)
    if (!record || record.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedException({
        error: 'INVALID_REFRESH',
        message: 'Invalid or expired refresh token',
      })
    }
    await this.refreshTokens.deleteById(record.id)
    return this.issueTokenPair(record.user)
  }

  async logout(actor: AuthUser, refreshToken: string): Promise<{ revoked: true }> {
    const hash = hashRefreshToken(refreshToken)
    const record = await this.refreshTokens.findByHashWithUser(hash)
    if (
      !record ||
      record.expiresAt.getTime() <= Date.now() ||
      record.userId !== actor.userId
    ) {
      throw new UnauthorizedException({
        error: 'INVALID_LOGOUT',
        message: 'Refresh token is missing, expired, or does not belong to this account',
      })
    }
    await this.refreshTokens.deleteById(record.id)
    return { revoked: true }
  }

  async getMe(actor: AuthUser): Promise<{
    id: string
    email: string
    createdAt: Date
  }> {
    const user = await this.usersService.findById(actor.userId)
    if (!user) {
      throw new UnauthorizedException({
        error: 'USER_NOT_FOUND',
        message: 'User no longer exists',
      })
    }
    return {
      id: user.id,
      email: user.email,
      createdAt: user.createdAt,
    }
  }

  private async issueTokenPair(user: User): Promise<AuthTokens> {
    const payload = { sub: user.id, email: user.email }
    const accessToken = await this.jwtService.signAsync(payload)
    const rawRefresh = generateRawRefreshToken()
    const expiresAt = new Date(Date.now() + parseDurationToMs(this.refreshExpiresIn))
    await this.refreshTokens.saveForUser(user.id, hashRefreshToken(rawRefresh), expiresAt)
    return {
      accessToken,
      refreshToken: rawRefresh,
      accessExpiresIn: this.accessExpiresIn,
    }
  }
}
