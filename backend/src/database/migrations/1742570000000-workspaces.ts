import { MigrationInterface, QueryRunner } from 'typeorm'

export class Workspaces1742570000000 implements MigrationInterface {
  name = 'Workspaces1742570000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "workspaces" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying NOT NULL,
        "created_by_user_id" uuid,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_workspaces_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_workspaces_created_by" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL
      )
    `)
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "workspace_members" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "workspace_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "role" character varying(32) NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_workspace_members_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_workspace_members_workspace_user" UNIQUE ("workspace_id", "user_id"),
        CONSTRAINT "CHK_workspace_members_role" CHECK ("role" IN ('owner', 'admin', 'member')),
        CONSTRAINT "FK_workspace_members_workspace" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_workspace_members_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_workspace_members_workspace_id" ON "workspace_members" ("workspace_id")`,
    )
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_workspace_members_user_id" ON "workspace_members" ("user_id")`,
    )
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "workspace_invites" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "workspace_id" uuid NOT NULL,
        "email" character varying NOT NULL,
        "role" character varying(32) NOT NULL,
        "token_hash" character varying NOT NULL,
        "expires_at" TIMESTAMPTZ NOT NULL,
        "invited_by_user_id" uuid NOT NULL,
        "accepted_at" TIMESTAMPTZ,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_workspace_invites_id" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_workspace_invites_token_hash" UNIQUE ("token_hash"),
        CONSTRAINT "CHK_workspace_invites_role" CHECK ("role" IN ('owner', 'admin', 'member')),
        CONSTRAINT "FK_workspace_invites_workspace" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_workspace_invites_invited_by" FOREIGN KEY ("invited_by_user_id") REFERENCES "users"("id") ON DELETE CASCADE
      )
    `)
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_workspace_invites_workspace_id" ON "workspace_invites" ("workspace_id")`,
    )
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_workspace_invites_email_workspace" ON "workspace_invites" ("workspace_id", "email")`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_workspace_invites_email_workspace"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_workspace_invites_workspace_id"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "workspace_invites"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_workspace_members_user_id"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_workspace_members_workspace_id"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "workspace_members"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "workspaces"`)
  }
}
