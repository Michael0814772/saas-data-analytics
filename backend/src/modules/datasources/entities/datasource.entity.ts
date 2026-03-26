import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'
import { DatasourceStatus } from '../enums/datasource-status.enum'

@Entity('datasources')
@Index(['workspaceId'])
@Index(['workspaceId', 'type'])
export class DatasourceEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'workspace_id', type: 'uuid' })
  workspaceId: string

  @Column({ name: 'type', length: 32 })
  type: string

  @Column({ name: 'config', type: 'jsonb' })
  config: Record<string, unknown>

  @Column({ name: 'status', type: 'varchar', length: 32, default: DatasourceStatus.DISCONNECTED })
  status: DatasourceStatus

  @Column({ name: 'last_sync', type: 'timestamptz', nullable: true })
  lastSync: Date | null

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updatedAt: Date
}

