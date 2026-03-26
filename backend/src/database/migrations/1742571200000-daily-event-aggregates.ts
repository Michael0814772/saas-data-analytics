import { MigrationInterface, QueryRunner } from 'typeorm'

export class DailyEventAggregates1742571200000 implements MigrationInterface {
  name = 'DailyEventAggregates1742571200000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "daily_event_aggregates" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "workspace_id" uuid NOT NULL,
        "date" date NOT NULL,
        "event_name" character varying(200) NOT NULL,
        "count" integer NOT NULL,
        "unique_users" integer NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_daily_event_aggregates_id" PRIMARY KEY ("id")
      )
    `)

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_daily_event_aggregates_workspace_date_event"
      ON "daily_event_aggregates" ("workspace_id", "date", "event_name")
    `)

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_daily_event_aggregates_workspace_date" ON "daily_event_aggregates" ("workspace_id", "date")`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_daily_event_aggregates_workspace_date"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_daily_event_aggregates_workspace_date_event"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "daily_event_aggregates"`)
  }
}

