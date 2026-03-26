import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm'

@Entity('workspace_daily_usage')
@Index(['workspaceId', 'date'], { unique: true })
export class WorkspaceDailyUsageEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string

  // UTC day bucket (YYYY-MM-DD stored as date)
  @Column({ type: 'date' })
  date: string

  @Column({ name: 'events_inserted', type: 'integer', default: 0 })
  eventsInserted: number

  @Column({ name: 'bytes_received', type: 'bigint', default: 0 })
  bytesReceived: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}

