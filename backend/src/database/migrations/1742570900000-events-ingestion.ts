import { MigrationInterface, QueryRunner } from 'typeorm'

export class Events1742570900000 implements MigrationInterface {
  name = 'Events1742570900000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "events" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "workspace_id" uuid NOT NULL,
        "source_id" character varying(128) NOT NULL,
        "event_name" character varying(200) NOT NULL,
        "timestamp" TIMESTAMPTZ NOT NULL,
        "idempotency_key" character varying(256) NOT NULL,
        "properties" jsonb NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_events_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_events_workspace_idempotency" UNIQUE ("workspace_id", "idempotency_key")
      )
    `)

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_events_workspace_timestamp" ON "events" ("workspace_id", "timestamp")`,
    )
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_events_workspace_eventName" ON "events" ("workspace_id", "event_name")`,
    )

    // Ensure idempotency is protected by a unique index (helps if the table existed before the migration).
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_events_workspace_idempotency"
      ON "events" ("workspace_id", "idempotency_key")
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_events_workspace_idempotency"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_events_workspace_eventName"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_events_workspace_timestamp"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "events"`)
  }
}

