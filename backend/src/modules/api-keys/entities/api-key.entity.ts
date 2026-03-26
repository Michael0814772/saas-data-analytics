import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { Workspace } from '../../workspaces/entities/workspace.entity'

@Entity('api_keys')
@Index(['workspaceId'])
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string

  @ManyToOne(() => Workspace, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'workspace_id' })
  workspace: Workspace

  @Column({ name: 'key_hash', unique: true })
  keyHash: string

  @Column({ name: 'key_prefix', length: 32 })
  keyPrefix: string

  @Column({ length: 120 })
  name: string

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  permissions: string[]

  /** Used by ingestion to resolve sourceId server-side (client never sends sourceId). */
  @Column({ name: 'source_id', length: 128 })
  sourceId: string

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @Column({ name: 'last_used_at', type: 'timestamptz', nullable: true })
  lastUsedAt: Date | null

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt: Date | null
}
