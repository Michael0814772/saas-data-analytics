import { MigrationInterface, QueryRunner } from 'typeorm'

export class WorkspaceDailyUsage1742571400000 implements MigrationInterface {
  name = 'WorkspaceDailyUsage1742571400000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "workspace_daily_usage" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "workspace_id" uuid NOT NULL,
        "date" date NOT NULL,
        "events_inserted" integer NOT NULL DEFAULT 0,
        "bytes_received" bigint NOT NULL DEFAULT 0,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_workspace_daily_usage_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_workspace_daily_usage_workspace" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE
      )
    `)

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_workspace_daily_usage_workspace_date"
      ON "workspace_daily_usage" ("workspace_id", "date")
    `)

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_workspace_daily_usage_date"
      ON "workspace_daily_usage" ("date")
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_workspace_daily_usage_date"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_workspace_daily_usage_workspace_date"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "workspace_daily_usage"`)
  }
}

