import { Injectable, Logger } from '@nestjs/common'
import { User } from './entities/user.entity'
import { UserRepository } from './user.repository'

/**
 * Thin facade over {@link UserRepository} for other modules (auth, workspaces).
 * Keeps user lookups and creation behind one service boundary.
 */
@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name)

  constructor(private readonly users: UserRepository) {}

  /** Lookup by normalized email (repository lowercases). */
  async findByEmail(email: string): Promise<User | null> {
    this.logger.debug(`users.findByEmail`)
    return this.users.findByEmail(email)
  }

  async findById(id: string): Promise<User | null> {
    this.logger.debug(`users.findById userId=${id}`)
    return this.users.findById(id)
  }

  /** Used when you already have a password hash (e.g. legacy paths); register uses TypeORM directly. */
  async create(email: string, passwordHash: string): Promise<User> {
    this.logger.log(`users.create request`)
    return this.users.create({ email, passwordHash })
  }
}
