import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { RefreshToken } from './entities/refresh-token.entity'
import { User } from '../users/entities/user.entity'

@Injectable()
export class RefreshTokenRepository {
  constructor(
    @InjectRepository(RefreshToken)
    private readonly repo: Repository<RefreshToken>,
  ) {}

  async saveForUser(userId: string, tokenHash: string, expiresAt: Date): Promise<RefreshToken> {
    const row = this.repo.create({ userId, tokenHash, expiresAt })
    return this.repo.save(row)
  }

  async findByHashWithUser(tokenHash: string): Promise<(RefreshToken & { user: User }) | null> {
    return this.repo.findOne({
      where: { tokenHash },
      relations: { user: true },
    })
  }

  async deleteById(id: string): Promise<void> {
    await this.repo.delete({ id })
  }

  async deleteByHash(tokenHash: string): Promise<void> {
    await this.repo.delete({ tokenHash })
  }
}
