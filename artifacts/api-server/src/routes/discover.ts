import { Router, type IRouter } from "express";
import { db, groupsTable, groupMembersTable, usersTable } from "@workspace/db";
import { and, eq, ilike, or, sql, desc, asc } from "drizzle-orm";
import { getAuth } from "@clerk/express";

const router: IRouter = Router();

/**
 * Discover endpoint powering the Explore page. Unlike GET /groups (which is
 * intentionally generic), this returns ONLY browseable classes — never
 * direct-message threads, never inactive groups — and joins back the creator
 * and the caller's membership flag so the UI can show "Joined" or "Join" in a
 * single round-trip.
 *
 * Query params:
 *   q          — free-text search across name, subject, description, creator name
 *   category   — exact subject match (case-insensitive)
 *   sort       — "trending" | "new" | "free" (default: "trending")
 *   priceMax   — only return groups <= this price ("free" if 0)
 *   limit      — page size, capped at 50 (default 30)
 *   offset     — pagination cursor (default 0)
 */
router.get("/groups/discover", async (req, res): Promise<void> => {
  const auth = getAuth(req);
  const clerkUserId = auth?.userId;

  // Resolve the caller's internal user id, if signed in. Discover should still
  // work for unauthenticated previews, so we don't 401 here — we just skip the
  // membership join.
  let meId: number | null = null;
  if (clerkUserId) {
    const [me] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.clerkUserId, clerkUserId))
      .limit(1);
    meId = me?.id ?? null;
  }

  const q = String(req.query.q ?? "").trim();
  const category = String(req.query.category ?? "").trim();
  const sort = String(req.query.sort ?? "trending");
  const priceMaxRaw = req.query.priceMax;
  const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 30) || 30));
  const offset = Math.max(0, Number(req.query.offset ?? 0) || 0);

  const conditions = [
    sql`${groupsTable.type} = 'class'`,
    eq(groupsTable.isActive, true),
  ];

  if (q.length > 0) {
    const needle = `%${q}%`;
    conditions.push(
      or(
        ilike(groupsTable.name, needle),
        ilike(groupsTable.subject, needle),
        ilike(groupsTable.description, needle),
        ilike(usersTable.name, needle),
      )!,
    );
  }

  if (category.length > 0) {
    // Case-insensitive exact match so "Business" and "business" both work.
    conditions.push(sql`LOWER(${groupsTable.subject}) = LOWER(${category})`);
  }

  if (priceMaxRaw !== undefined) {
    const priceMax = Number(priceMaxRaw);
    if (!Number.isNaN(priceMax)) {
      // price column is numeric; NULL means free.
      conditions.push(sql`(${groupsTable.price} IS NULL OR ${groupsTable.price} <= ${priceMax})`);
    }
  }

  // Build the ORDER BY based on sort. "trending" = highest member count first
  // with newer breaking ties. "new" = newest first. "free" pushes free classes
  // to the top then orders by member count.
  let orderBy;
  if (sort === "new") {
    orderBy = [desc(groupsTable.createdAt)];
  } else if (sort === "free") {
    orderBy = [asc(sql`COALESCE(${groupsTable.price}, 0)`), desc(groupsTable.memberCount), desc(groupsTable.createdAt)];
  } else {
    orderBy = [desc(groupsTable.memberCount), desc(groupsTable.createdAt)];
  }

  const whereExpr = conditions.reduce((a, b) => and(a, b)!);

  // We left-join group_members on (group, me) so a single query tells us
  // whether the caller is already in the class.
  const rows = await db
    .select({
      id: groupsTable.id,
      name: groupsTable.name,
      description: groupsTable.description,
      subject: groupsTable.subject,
      price: groupsTable.price,
      subscriptionModel: groupsTable.subscriptionModel,
      memberCount: groupsTable.memberCount,
      coverImageUrl: groupsTable.coverImageUrl,
      createdAt: groupsTable.createdAt,
      creatorId: groupsTable.creatorId,
      creatorName: usersTable.name,
      creatorUsername: usersTable.username,
      creatorAvatarUrl: usersTable.avatarUrl,
      myMembership: meId
        ? sql<number | null>`(SELECT 1 FROM group_members WHERE group_id = ${groupsTable.id} AND user_id = ${meId} LIMIT 1)`
        : sql<number | null>`NULL`,
    })
    .from(groupsTable)
    .leftJoin(usersTable, eq(usersTable.id, groupsTable.creatorId))
    .where(whereExpr)
    .orderBy(...orderBy)
    .limit(limit)
    .offset(offset);

  const items = rows.map((r) => ({
    id: r.id,
    name: r.name,
    description: r.description ?? null,
    subject: r.subject ?? null,
    price: r.price != null ? parseFloat(r.price) : null,
    subscriptionModel: r.subscriptionModel ?? null,
    memberCount: r.memberCount,
    coverImageUrl: r.coverImageUrl ?? null,
    createdAt: r.createdAt,
    creator: {
      id: r.creatorId,
      name: r.creatorName ?? "Unknown",
      username: r.creatorUsername ?? null,
      avatarUrl: r.creatorAvatarUrl ?? null,
    },
    isMember: !!r.myMembership,
    isCreator: meId != null && r.creatorId === meId,
  }));

  res.json({ items, nextOffset: items.length === limit ? offset + limit : null });
});

/**
 * One-tap join for FREE classes. Paid classes return 402 so the client can
 * route to checkout (Stripe Connect, when wired). Idempotent: re-joining a
 * group you're already in is a no-op that returns 200.
 */
router.post("/groups/:id/join", async (req, res): Promise<void> => {
  const auth = getAuth(req);
  const clerkUserId = auth?.userId;
  if (!clerkUserId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const groupId = Number(req.params.id);
  if (!Number.isFinite(groupId) || groupId <= 0) {
    res.status(400).json({ error: "Invalid group id" });
    return;
  }

  const [me] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.clerkUserId, clerkUserId))
    .limit(1);
  if (!me) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const [group] = await db
    .select()
    .from(groupsTable)
    .where(eq(groupsTable.id, groupId))
    .limit(1);
  if (!group || group.type !== "class" || !group.isActive) {
    res.status(404).json({ error: "Class not found" });
    return;
  }

  const price = group.price != null ? parseFloat(group.price) : 0;
  if (price > 0) {
    res.status(402).json({ error: "Paid class — checkout required.", price });
    return;
  }

  // Already a member? Idempotent success.
  const [existing] = await db
    .select({ id: groupMembersTable.id })
    .from(groupMembersTable)
    .where(and(eq(groupMembersTable.groupId, groupId), eq(groupMembersTable.userId, me.id)))
    .limit(1);
  if (existing) {
    res.json({ joined: true, alreadyMember: true });
    return;
  }

  await db.insert(groupMembersTable).values({ groupId, userId: me.id, role: "student" });
  await db
    .update(groupsTable)
    .set({ memberCount: sql`${groupsTable.memberCount} + 1` })
    .where(eq(groupsTable.id, groupId));

  res.status(201).json({ joined: true, alreadyMember: false });
});

export default router;
