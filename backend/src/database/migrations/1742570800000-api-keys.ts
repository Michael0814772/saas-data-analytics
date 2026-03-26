import { MigrationInterface, QueryRunner } from 'typeorm'

export class ApiKeys1742570800000 implements MigrationInterface {
  name = 'ApiKeys1742570800000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "api_keys" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "workspace_id" uuid NOT NULL,
        "key_hash" character varying NOT NULL,
        "key_prefix" character varying(32) NOT NULL,
        "name" character varying(120) NOT NULL,
        "permissions" jsonb NOT NULL DEFAULT '[]'::jsonb,
        "source_id" character varying(128) NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "last_used_at" TIMESTAMPTZ,
        "revoked_at" TIMESTAMPTZ,
        CONSTRAINT "PK_api_keys_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_api_keys_key_hash" UNIQUE ("key_hash"),
        CONSTRAINT "FK_api_keys_workspace" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE
      )
    `)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_api_keys_workspace_id" ON "api_keys" ("workspace_id")`,
    )
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_api_keys_revoked_at" ON "api_keys" ("revoked_at")`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_api_keys_revoked_at"`)
    await queryRunner.query(`DROP INDEX "IDX_api_keys_workspace_id"`)
    await queryRunner.query(`DROP TABLE "api_keys"`)
  }
}
