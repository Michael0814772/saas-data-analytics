import { MigrationInterface, QueryRunner } from 'typeorm'

export class Datasources1742571300000 implements MigrationInterface {
  name = 'Datasources1742571300000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "datasources" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "workspace_id" uuid NOT NULL,
        "type" character varying(32) NOT NULL,
        "config" jsonb NOT NULL,
        "status" character varying(32) NOT NULL DEFAULT 'disconnected',
        "last_sync" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_datasources_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_datasources_workspace" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE
      )
    `)

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_datasources_workspace_id" ON "datasources" ("workspace_id")
    `)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_datasources_workspace_id_type" ON "datasources" ("workspace_id", "type")
    `)
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_datasources_status" ON "datasources" ("status")
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_datasources_status"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_datasources_workspace_id_type"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_datasources_workspace_id"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "datasources"`)
  }
}

