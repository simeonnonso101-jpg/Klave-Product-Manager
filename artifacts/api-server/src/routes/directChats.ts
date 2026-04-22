import { Router, type IRouter } from "express";
import { db, groupsTable, groupMembersTable, usersTable } from "@workspace/db";
import { eq, and, sql } from "drizzle-orm";
import { getAuth } from "@clerk/express";

const router: IRouter = Router();

async function getAuthedUserId(req: Parameters<typeof getAuth>[0]): Promise<number | null> {
  const auth = getAuth(req);
  const clerkUserId = auth?.userId;
  if (!clerkUserId) return null;
  const [u] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.clerkUserId, clerkUserId))
    .limit(1);
  return u?.id ?? null;
}

/**
 * Find-or-create a 1:1 direct-message group between the authenticated user
 * and the target user. DM groups are stored as `groups.type = 'dm'` with
 * exactly two rows in `group_members`. The deterministic name `dm:<min>:<max>`
 * makes lookups cheap and prevents duplicates.
 */
router.post("/direct-chats", async (req, res): Promise<void> => {
  const meId = await getAuthedUserId(req);
  if (!meId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const targetIdRaw = (req.body as any)?.userId;
  const targetId = typeof targetIdRaw === "number" ? targetIdRaw : parseInt(String(targetIdRaw ?? ""), 10);
  if (!Number.isFinite(targetId) || targetId <= 0) {
    res.status(400).json({ error: "Invalid userId" });
    return;
  }
  if (targetId === meId) {
    res.status(400).json({ error: "Cannot start a chat with yourself" });
    return;
  }

  const [target] = await db
    .select({ id: usersTable.id, name: usersTable.name })
    .from(usersTable)
    .where(eq(usersTable.id, targetId))
    .limit(1);
  if (!target) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const a = Math.min(meId, targetId);
  const b = Math.max(meId, targetId);
  const dmName = `dm:${a}:${b}`;

  // Idempotent find-or-create using a partial unique index on
  // (name) WHERE type='personal'. ON CONFLICT DO NOTHING means a concurrent
  // creator wins the race; we then re-fetch to get whichever row survived.
  const inserted = await db
    .insert(groupsTable)
    .values({
      name: dmName,
      type: "personal",
      creatorId: meId,
      isActive: true,
      memberCount: 2,
    })
    .onConflictDoNothing({ target: groupsTable.name, where: sql`type = 'personal'` })
    .returning();

  let group = inserted[0];
  if (!group) {
    const [existing] = await db
      .select()
      .from(groupsTable)
      .where(and(eq(groupsTable.type, "personal"), eq(groupsTable.name, dmName)))
      .limit(1);
    if (existing) {
      res.json({ id: existing.id, type: existing.type });
      return;
    }
    res.status(500).json({ error: "Could not open direct chat" });
    return;
  }

  // Brand new DM — add both memberships. Use 'student' role to stay inside
  // the existing role enum the response schemas validate against.
  await db.insert(groupMembersTable).values([
    { groupId: group.id, userId: meId, role: "student" },
    { groupId: group.id, userId: targetId, role: "student" },
  ]);

  res.status(201).json({ id: group.id, type: group.type });
});

/**
 * List the authenticated user's DM threads with the OTHER participant
 * resolved server-side, plus the most recent message preview.
 */
router.get("/direct-chats", async (req, res): Promise<void> => {
  const meId = await getAuthedUserId(req);
  if (!meId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const rows = await db.execute(sql`
    SELECT
      g.id            AS "groupId",
      g.updated_at    AS "updatedAt",
      u.id            AS "otherUserId",
      u.name          AS "otherUserName",
      u.avatar_url    AS "otherUserAvatarUrl",
      m.content       AS "lastMessageContent",
      m.created_at    AS "lastMessageAt"
    FROM groups g
    INNER JOIN group_members gm_me    ON gm_me.group_id = g.id AND gm_me.user_id = ${meId}
    INNER JOIN group_members gm_other ON gm_other.group_id = g.id AND gm_other.user_id <> ${meId}
    INNER JOIN users u                ON u.id = gm_other.user_id
    LEFT JOIN LATERAL (
      SELECT content, created_at FROM messages WHERE group_id = g.id ORDER BY created_at DESC LIMIT 1
    ) m ON TRUE
    WHERE g.type = 'personal' AND g.name LIKE 'dm:%'
    ORDER BY COALESCE(m.created_at, g.updated_at) DESC
    LIMIT 100
  `);

  res.json(rows.rows ?? rows);
});

export default router;
