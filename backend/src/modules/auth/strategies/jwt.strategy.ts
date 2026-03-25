import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'
import type { AppConfig } from '../../../shared/config/configuration'
import type { AuthUser } from '../../../shared/types/auth-user.type'

type AccessTokenPayload = {
  sub: string
  email: string
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    const jwt = configService.get<AppConfig['jwt']>('app.jwt', { infer: true })
    if (!jwt) {
      throw new Error('JWT configuration is missing')
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwt.accessSecret,
    })
  }

  validate(payload: AccessTokenPayload): AuthUser {
    return {
      userId: payload.sub,
      email: payload.email,
    }
  }
}
