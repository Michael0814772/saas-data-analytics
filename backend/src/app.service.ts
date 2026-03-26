import { Injectable } from '@nestjs/common'
import { DataSource } from 'typeorm'

/** Tiny helper used by {@link AppController} for the root hello response. */
@Injectable()
export class AppService {
  constructor(private readonly dataSource: DataSource) {}

  getHello(): string {
    return 'Hello World!'
  }

  async dbReady(): Promise<boolean> {
    try {
      await this.dataSource.query('SELECT 1')
      return true
    } catch {
      return false
    }
  }
}
