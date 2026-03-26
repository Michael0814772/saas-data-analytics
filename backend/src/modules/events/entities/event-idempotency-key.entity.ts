import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

@Entity('event_idempotency_keys')
@Index(['workspaceId'])
@Index(['expiresAt'])
export class EventIdempotencyKey {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string

  @Column({ name: 'idempotency_key', length: 256 })
  idempotencyKey: string

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date
}

