import {
  ConflictException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { DataSource } from 'typeorm'
import * as bcrypt from 'bcrypt'
import { createHash } from 'crypto'
import type { AppConfig } from '../../shared/config/configuration'
import type { AuthUser } from '../../shared/types/auth-user.type'
import { User } from '../users/entities/user.entity'
import { UsersService } from '../users/users.service'
import { WorkspacesService } from '../workspaces/workspaces.service'
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

/**
 * Core auth logic: passwords (bcrypt), JWT access tokens, opaque refresh tokens (hashed in DB).
 * Register runs user + default workspace in one DB transaction.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name)
  private readonly accessExpiresIn: string
  private readonly refreshExpiresIn: string

  constructor(
    private readonly config: ConfigService,
    private readonly dataSource: DataSource,
    private readonly jwtService: JwtService,
    private readonly usersService: UsersService,
    private readonly workspaces: WorkspacesService,
    private readonly refreshTokens: RefreshTokenRepository,
  ) {
    const jwt = this.config.get<AppConfig['jwt']>('app.jwt', { infer: true })
    if (!jwt) {
      throw new Error('JWT configuration is missing')
    }
    this.accessExpiresIn = jwt.accessExpiresIn
    this.refreshExpiresIn = jwt.refreshExpiresIn
  }

  private toEmailHash(email: string): string {
    return createHash('sha256').update(email.toLowerCase()).digest('hex').slice(0, 12)
  }

  /** New user row + default workspace + token pair. */
  async register(dto: RegisterDto): Promise<{
    user: { id: string; email: string }
  } & AuthTokens> {
    const startedAt = Date.now()
    const emailHash = this.toEmailHash(dto.email)
    const existing = await this.usersService.findByEmail(dto.email)
    if (existing) {
      this.logger.warn(`auth.register email_taken emailHash=${emailHash}`)
      throw new ConflictException({
        error: 'EMAIL_TAKEN',
        message: 'An account with this email already exists',
      })
    }
    const passwordHash = await bcrypt.hash(dto.password, 12)
    const user = await this.dataSource.transaction(async (manager) => {
      const userRepo = manager.getRepository(User)
      const created = await userRepo.save(
        userRepo.create({
          email: dto.email.toLowerCase(),
          passwordHash,
        }),
      )
      await this.workspaces.createDefaultWorkspaceForNewUser(manager, created.id)
      return created
    })
    const tokens = await this.issueTokenPair(user)
    this.logger.log(
      `auth.register success userId=${user.id} emailHash=${emailHash} durationMs=${Date.now() - startedAt}`,
    )
    return {
      user: { id: user.id, email: user.email },
      ...tokens,
    }
  }

  /** Validate credentials and return a new token pair. */
  async login(dto: LoginDto): Promise<{
    user: { id: string; email: string }
  } & AuthTokens> {
    const startedAt = Date.now()
    const emailHash = this.toEmailHash(dto.email)
    const user = await this.usersService.findByEmail(dto.email)
    if (!user) {
      this.logger.warn(`auth.login invalid_credentials emailHash=${emailHash}`)
      throw new UnauthorizedException({
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      })
    }
    const passwordValid = await bcrypt.compare(dto.password, user.passwordHash)
    if (!passwordValid) {
      this.logger.warn(`auth.login invalid_credentials userId=${user.id} emailHash=${emailHash}`)
      throw new UnauthorizedException({
        error: 'INVALID_CREDENTIALS',
        message: 'Invalid email or password',
      })
    }
    const tokens = await this.issueTokenPair(user)
    this.logger.log(
      `auth.login success userId=${user.id} durationMs=${Date.now() - startedAt}`,
    )
    return {
      user: { id: user.id, email: user.email },
      ...tokens,
    }
  }

  /** One-time use: old refresh row deleted, new pair issued. */
  async refresh(refreshToken: string): Promise<AuthTokens> {
    const startedAt = Date.now()
    const hash = hashRefreshToken(refreshToken)
    const record = await this.refreshTokens.findByHashWithUser(hash)
    if (!record || record.expiresAt.getTime() <= Date.now()) {
      this.logger.warn(`auth.refresh invalid_refresh`)
      throw new UnauthorizedException({
        error: 'INVALID_REFRESH',
        message: 'Invalid or expired refresh token',
      })
    }
    await this.refreshTokens.deleteById(record.id)
    const tokens = await this.issueTokenPair(record.user)
    this.logger.log(
      `auth.refresh success userId=${record.userId} durationMs=${Date.now() - startedAt}`,
    )
    return tokens
  }

  /** Ensures refresh belongs to JWT user, then deletes that refresh row. */
  async logout(actor: AuthUser, refreshToken: string): Promise<{ revoked: true }> {
    const startedAt = Date.now()
    const hash = hashRefreshToken(refreshToken)
    const record = await this.refreshTokens.findByHashWithUser(hash)
    if (
      !record ||
      record.expiresAt.getTime() <= Date.now() ||
      record.userId !== actor.userId
    ) {
      this.logger.warn(`auth.logout invalid_logout userId=${actor.userId}`)
      throw new UnauthorizedException({
        error: 'INVALID_LOGOUT',
        message: 'Refresh token is missing, expired, or does not belong to this account',
      })
    }
    await this.refreshTokens.deleteById(record.id)
    this.logger.log(
      `auth.logout success userId=${actor.userId} durationMs=${Date.now() - startedAt}`,
    )
    return { revoked: true }
  }

  /** Load fresh user row for /auth/me. */
  async getMe(actor: AuthUser): Promise<{
    id: string
    email: string
    createdAt: Date
  }> {
    const user = await this.usersService.findById(actor.userId)
    if (!user) {
      this.logger.warn(`auth.me user_not_found userId=${actor.userId}`)
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

  /** Signs JWT access token and persists hashed opaque refresh. */
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
