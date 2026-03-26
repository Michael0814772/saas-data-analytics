import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { User } from './entities/user.entity'

@Injectable()
export class UserRepository {
  private readonly logger = new Logger(UserRepository.name)

  constructor(
    @InjectRepository(User)
    private readonly repo: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    this.logger.debug(`users.repo.findByEmail`)
    return this.repo.findOne({ where: { email: email.toLowerCase() } })
  }

  async findById(id: string): Promise<User | null> {
    this.logger.debug(`users.repo.findById userId=${id}`)
    return this.repo.findOne({ where: { id } })
  }

  async create(data: { email: string; passwordHash: string }): Promise<User> {
    this.logger.log(`users.repo.create`)
    const user = this.repo.create({
      email: data.email.toLowerCase(),
      passwordHash: data.passwordHash,
    })
    return this.repo.save(user)
  }
}
