import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

@Entity('events')
@Index(['workspaceId', 'timestamp'])
@Index(['workspaceId', 'eventName'])
export class EventEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string

  @Column({ name: 'source_id', length: 128 })
  sourceId: string

  @Column({ name: 'event_name', length: 200 })
  eventName: string

  @Column({ type: 'timestamptz' })
  timestamp: Date

  @Column({ name: 'idempotency_key', length: 256 })
  idempotencyKey: string

  @Column({ type: 'jsonb' })
  properties: Record<string, unknown>

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date
}

