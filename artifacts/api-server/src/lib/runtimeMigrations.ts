import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "./logger";

/**
 * Self-healing migrations that run on every API boot.
 *
 * We use these for changes that are too small to push through drizzle-kit but
 * still need to land in production reliably (e.g. adding an index that the
 * direct-message find-or-create relies on, or repairing rows from a previous
 * release where DM groups were stored as type='dm' before the schema enums
 * were honored).
 *
 * Each statement is idempotent so booting an already-migrated server is a no-op.
 */
export async function runRuntimeMigrations(): Promise<void> {
  try {
    // 1) Heal any direct-message groups that were created with the old
    // type='dm' / role='member' values. These crash the response zod schemas
    // (which only allow type in {class,personal} and role in {creator,student}).
    // Safe no-op if no such rows exist.
    const healedGroups = await db.execute(sql`
      UPDATE groups SET type = 'personal'
      WHERE type = 'dm'
      RETURNING id
    `);
    const healedGroupCount = (healedGroups as any).rowCount
      ?? (healedGroups as any).rows?.length
      ?? 0;

    const healedMembers = await db.execute(sql`
      UPDATE group_members SET role = 'student'
      WHERE role = 'member'
      RETURNING group_id
    `);
    const healedMemberCount = (healedMembers as any).rowCount
      ?? (healedMembers as any).rows?.length
      ?? 0;

    // 2) Ensure the partial unique index exists. The DM find-or-create handler
    // relies on this for its ON CONFLICT clause; without it, every DM creation
    // returns 500. CREATE INDEX IF NOT EXISTS makes this safe to re-run.
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS groups_dm_canonical_name_idx
      ON groups (name)
      WHERE type = 'personal'
    `);

    logger.info(
      { healedGroupCount, healedMemberCount },
      "Runtime migrations applied",
    );
  } catch (err) {
    // Don't crash the server if migrations fail — log loudly and continue so
    // the rest of the API stays available while we investigate.
    logger.error({ err }, "Runtime migrations failed");
  }
}
