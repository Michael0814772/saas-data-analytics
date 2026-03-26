import { MigrationInterface, QueryRunner } from 'typeorm'

export class EventIdempotencyExpiry1742571000000 implements MigrationInterface {
  name = 'EventIdempotencyExpiry1742571000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "event_idempotency_keys" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "workspace_id" uuid NOT NULL,
        "idempotency_key" character varying(256) NOT NULL,
        "expires_at" TIMESTAMPTZ NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_event_idempotency_keys_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_event_idempotency_keys_workspace_key" UNIQUE ("workspace_id", "idempotency_key")
      )
    `)

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_event_idempotency_keys_expires_at" ON "event_idempotency_keys" ("expires_at")`,
    )

    // The old Step 5 implementation created a UNIQUE constraint on events
    // that prevented replays even after TTL. Now we rely on the dedicated
    // idempotency key table for expiry, so we drop that uniqueness.
    await queryRunner.query(
      `ALTER TABLE "events" DROP CONSTRAINT IF EXISTS "UQ_events_workspace_idempotency"`,
    )
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_events_workspace_idempotency"`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_event_idempotency_keys_expires_at"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "event_idempotency_keys"`)
  }
}

