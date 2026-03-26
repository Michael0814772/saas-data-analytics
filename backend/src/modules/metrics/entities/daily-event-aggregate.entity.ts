import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

@Entity('daily_event_aggregates')
@Index(['workspaceId', 'date', 'eventName'], { unique: true })
@Index(['workspaceId', 'date'])
export class DailyEventAggregate {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string

  // Date bucket in UTC (YYYY-MM-DD stored as date)
  @Column({ type: 'date' })
  date: string

  @Column({ name: 'event_name', length: 200 })
  eventName: string

  @Column({ type: 'integer' })
  count: number

  @Column({ name: 'unique_users', type: 'integer' })
  uniqueUsers: number

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}

