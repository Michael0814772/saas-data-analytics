import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { RefreshToken } from './entities/refresh-token.entity'
import { User } from '../users/entities/user.entity'

@Injectable()
export class RefreshTokenRepository {
  private readonly logger = new Logger(RefreshTokenRepository.name)

  constructor(
    @InjectRepository(RefreshToken)
    private readonly repo: Repository<RefreshToken>,
  ) {}

  async saveForUser(userId: string, tokenHash: string, expiresAt: Date): Promise<RefreshToken> {
    this.logger.debug(`auth.refresh_tokens.save userId=${userId}`)
    const row = this.repo.create({ userId, tokenHash, expiresAt })
    return this.repo.save(row)
  }

  async findByHashWithUser(tokenHash: string): Promise<(RefreshToken & { user: User }) | null> {
    this.logger.debug(`auth.refresh_tokens.findByHash`)
    return this.repo.findOne({
      where: { tokenHash },
      relations: { user: true },
    })
  }

  async deleteById(id: string): Promise<void> {
    this.logger.debug(`auth.refresh_tokens.deleteById`)
    await this.repo.delete({ id })
  }

  async deleteByHash(tokenHash: string): Promise<void> {
    this.logger.debug(`auth.refresh_tokens.deleteByHash`)
    await this.repo.delete({ tokenHash })
  }
}
