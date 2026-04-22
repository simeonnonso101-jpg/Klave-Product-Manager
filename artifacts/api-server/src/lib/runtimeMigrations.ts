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

    // 1b) Ensure the username column + case-insensitive unique index exist.
    // Usernames are optional (nullable) so the legacy users created before this
    // feature can still log in; they pick one in onboarding or profile edit.
    // Uniqueness is enforced on LOWER(username) so "Ada" and "ada" can't both
    // exist. The partial WHERE clause skips NULLs (multiple users may have no
    // username yet without colliding).
    await db.execute(sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT`);
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_unique_idx
      ON users (LOWER(username))
      WHERE username IS NOT NULL
    `);

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
