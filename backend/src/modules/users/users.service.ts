import { Injectable } from '@nestjs/common'
import { User } from './entities/user.entity'
import { UserRepository } from './user.repository'

@Injectable()
export class UsersService {
  constructor(private readonly users: UserRepository) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.users.findByEmail(email)
  }

  async findById(id: string): Promise<User | null> {
    return this.users.findById(id)
  }

  async create(email: string, passwordHash: string): Promise<User> {
    return this.users.create({ email, passwordHash })
  }
}
