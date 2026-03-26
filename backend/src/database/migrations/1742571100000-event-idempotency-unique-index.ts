import { MigrationInterface, QueryRunner } from 'typeorm'

export class EventIdempotencyUniqueIndex1742571100000 implements MigrationInterface {
  name = 'EventIdempotencyUniqueIndex1742571100000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure we have a unique index for (workspace_id, idempotency_key) so
    // Postgres can support ON CONFLICT upserts.
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_event_idempotency_keys_workspace_key"
      ON "event_idempotency_keys" ("workspace_id", "idempotency_key")
    `)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_event_idempotency_keys_workspace_key"`)
  }
}

