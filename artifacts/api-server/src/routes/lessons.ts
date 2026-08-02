import { Router, type IRouter } from "express";
import { db, lessonsTable, lessonCompletionsTable, groupsTable, groupMembersTable, usersTable } from "@workspace/db";
import { and, eq, asc, lte, or, isNull, sql as drizzleSql, count } from "drizzle-orm";
import { getAuth } from "@clerk/express";

const router: IRouter = Router();

async function getInternalId(clerkUserId: string): Promise<number | null> {
  const [u] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.clerkUserId, clerkUserId))
    .limit(1);
  return u?.id ?? null;
}

async function resolveAccess(
  req: Parameters<typeof getAuth>[0],
  groupId: number,
): Promise<{ meId: number | null; isCreator: boolean; isMember: boolean; group: { price: string | null; creatorId: number; type: string; isActive: boolean; name: string } | null }> {
  const [group] = await db
    .select({ id: groupsTable.id, price: groupsTable.price, creatorId: groupsTable.creatorId, type: groupsTable.type, isActive: groupsTable.isActive, name: groupsTable.name })
    .from(groupsTable)
    .where(eq(groupsTable.id, groupId))
    .limit(1);

  if (!group) return { meId: null, isCreator: false, isMember: false, group: null };

  const auth = getAuth(req);
  let meId: number | null = null;
  if (auth?.userId) meId = await getInternalId(auth.userId);

  const isCreator = meId != null && meId === group.creatorId;
  let isMember = isCreator;
  if (!isMember && meId != null) {
    const [m] = await db
      .select({ id: groupMembersTable.id })
      .from(groupMembersTable)
      .where(and(eq(groupMembersTable.groupId, groupId), eq(groupMembersTable.userId, meId)))
      .limit(1);
    isMember = !!m;
  }

  return { meId, isCreator, isMember, group };
}

/**
 * GET /groups/:groupId/lessons
 * List lessons. Drip lessons not yet available are hidden from students.
 */
router.get("/groups/:groupId/lessons", async (req, res): Promise<void> => {
  const groupId = Number(req.params.groupId);
  if (!Number.isFinite(groupId) || groupId <= 0) { res.status(400).json({ error: "Invalid group id" }); return; }

  const { meId, isCreator, isMember, group } = await resolveAccess(req, groupId);
  if (!group || group.type !== "class" || !group.isActive) { res.status(404).json({ error: "Class not found" }); return; }

  const isPaid = group.price != null && parseFloat(group.price) > 0;
  if (isPaid && !isMember) { res.status(403).json({ error: "Join this class to access lessons." }); return; }

  const now = new Date();
  let rows;
  if (isCreator) {
    // Creators see everything including drip-locked and unpublished
    rows = await db
      .select()
      .from(lessonsTable)
      .where(and(eq(lessonsTable.groupId, groupId), eq(lessonsTable.isPublished, true)))
      .orderBy(asc(lessonsTable.position), asc(lessonsTable.createdAt));
  } else {
    // Students only see lessons with no publishAt or publishAt <= now
    rows = await db
      .select()
      .from(lessonsTable)
      .where(and(
        eq(lessonsTable.groupId, groupId),
        eq(lessonsTable.isPublished, true),
        or(isNull(lessonsTable.publishAt), lte(lessonsTable.publishAt, now)),
      ))
      .orderBy(asc(lessonsTable.position), asc(lessonsTable.createdAt));
  }

  // Also return all upcoming drip lessons (so UI can show "coming on date") for members
  let upcoming: typeof rows = [];
  if (isMember && !isCreator) {
    upcoming = await db
      .select()
      .from(lessonsTable)
      .where(and(
        eq(lessonsTable.groupId, groupId),
        eq(lessonsTable.isPublished, true),
        drizzleSql`${lessonsTable.publishAt} > ${now}`,
      ))
      .orderBy(asc(lessonsTable.publishAt));
  }

  // Completion data for the requesting user
  let completedIds: number[] = [];
  if (meId) {
    const completions = await db
      .select({ lessonId: lessonCompletionsTable.lessonId })
      .from(lessonCompletionsTable)
      .where(eq(lessonCompletionsTable.userId, meId));
    completedIds = completions.map(c => c.lessonId);
  }

  const preview = !isMember && !isPaid;
  const lessonsList = preview ? rows.slice(0, 3) : rows;

  res.json({
    lessons: lessonsList.map(l => ({ ...l, isCompleted: completedIds.includes(l.id) })),
    upcoming: upcoming.map(l => ({ ...l, isCompleted: false })),
    isPreview: preview,
    total: rows.length,
    completedIds,
  });
});

/**
 * GET /groups/:groupId/lessons/:lessonId
 * Fetch a single lesson with prev/next nav and completion state.
 */
router.get("/groups/:groupId/lessons/:lessonId", async (req, res): Promise<void> => {
  const groupId = Number(req.params.groupId);
  const lessonId = Number(req.params.lessonId);
  if (!Number.isFinite(groupId) || !Number.isFinite(lessonId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { meId, isCreator, isMember, group } = await resolveAccess(req, groupId);
  if (!group || group.type !== "class" || !group.isActive) { res.status(404).json({ error: "Class not found" }); return; }

  const isPaid = group.price != null && parseFloat(group.price) > 0;
  if (isPaid && !isMember) { res.status(403).json({ error: "Join this class to access lessons." }); return; }

  const [lesson] = await db
    .select()
    .from(lessonsTable)
    .where(and(eq(lessonsTable.id, lessonId), eq(lessonsTable.groupId, groupId)))
    .limit(1);

  if (!lesson || (!isCreator && !lesson.isPublished)) { res.status(404).json({ error: "Lesson not found" }); return; }

  const now = new Date();
  // Drip lock: students can't access future-scheduled lessons
  if (!isCreator && lesson.publishAt && lesson.publishAt > now) {
    res.status(403).json({ error: "This lesson isn't available yet.", publishAt: lesson.publishAt });
    return;
  }

  const siblings = await db
    .select({ id: lessonsTable.id, title: lessonsTable.title, position: lessonsTable.position })
    .from(lessonsTable)
    .where(and(
      eq(lessonsTable.groupId, groupId),
      eq(lessonsTable.isPublished, true),
      or(isNull(lessonsTable.publishAt), lte(lessonsTable.publishAt, now)),
    ))
    .orderBy(asc(lessonsTable.position), asc(lessonsTable.createdAt));

  const idx = siblings.findIndex((s) => s.id === lesson.id);
  const prev = idx > 0 ? siblings[idx - 1] : null;
  const next = idx < siblings.length - 1 ? siblings[idx + 1] : null;

  let isCompleted = false;
  if (meId) {
    const [c] = await db
      .select({ id: lessonCompletionsTable.id })
      .from(lessonCompletionsTable)
      .where(and(eq(lessonCompletionsTable.userId, meId), eq(lessonCompletionsTable.lessonId, lessonId)))
      .limit(1);
    isCompleted = !!c;
  }

  res.json({ lesson, prev, next, isCreator, isCompleted, groupName: group.name });
});

/**
 * POST /groups/:groupId/lessons/:lessonId/complete
 * Mark a lesson as completed for the current user. Idempotent.
 */
router.post("/groups/:groupId/lessons/:lessonId/complete", async (req, res): Promise<void> => {
  const auth = getAuth(req);
  if (!auth?.userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const groupId = Number(req.params.groupId);
  const lessonId = Number(req.params.lessonId);
  if (!Number.isFinite(groupId) || !Number.isFinite(lessonId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const meId = await getInternalId(auth.userId);
  if (!meId) { res.status(404).json({ error: "User not found" }); return; }

  // Idempotent upsert
  await db
    .insert(lessonCompletionsTable)
    .values({ userId: meId, lessonId, groupId })
    .onConflictDoNothing();

  // Check if ALL lessons in the group are now complete → certificate is available
  const [total] = await db
    .select({ n: count() })
    .from(lessonsTable)
    .where(and(eq(lessonsTable.groupId, groupId), eq(lessonsTable.isPublished, true)));
  const [done] = await db
    .select({ n: count() })
    .from(lessonCompletionsTable)
    .where(and(eq(lessonCompletionsTable.userId, meId), eq(lessonCompletionsTable.groupId, groupId)));

  const totalN = Number((total as any)?.n ?? 0);
  const doneN = Number((done as any)?.n ?? 0);
  const courseComplete = totalN > 0 && doneN >= totalN;

  res.json({ ok: true, completed: doneN, total: totalN, courseComplete });
});

/**
 * DELETE /groups/:groupId/lessons/:lessonId/complete
 * Unmark a lesson completion (undo).
 */
router.delete("/groups/:groupId/lessons/:lessonId/complete", async (req, res): Promise<void> => {
  const auth = getAuth(req);
  if (!auth?.userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const groupId = Number(req.params.groupId);
  const lessonId = Number(req.params.lessonId);
  const meId = await getInternalId(auth.userId);
  if (!meId) { res.status(404).json({ error: "User not found" }); return; }

  await db
    .delete(lessonCompletionsTable)
    .where(and(eq(lessonCompletionsTable.userId, meId), eq(lessonCompletionsTable.lessonId, lessonId)));

  res.json({ ok: true });
});

/**
 * GET /groups/:groupId/progress
 * Get the current user's completion progress in a group.
 */
router.get("/groups/:groupId/progress", async (req, res): Promise<void> => {
  const auth = getAuth(req);
  if (!auth?.userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const groupId = Number(req.params.groupId);
  const meId = await getInternalId(auth.userId);
  if (!meId) { res.status(404).json({ error: "User not found" }); return; }

  const [total] = await db
    .select({ n: count() })
    .from(lessonsTable)
    .where(and(eq(lessonsTable.groupId, groupId), eq(lessonsTable.isPublished, true)));

  const completions = await db
    .select({ lessonId: lessonCompletionsTable.lessonId, completedAt: lessonCompletionsTable.completedAt })
    .from(lessonCompletionsTable)
    .where(and(eq(lessonCompletionsTable.userId, meId), eq(lessonCompletionsTable.groupId, groupId)));

  const totalN = Number((total as any)?.n ?? 0);
  const completedIds = completions.map(c => c.lessonId);
  const courseComplete = totalN > 0 && completedIds.length >= totalN;

  res.json({ completed: completedIds.length, total: totalN, completedIds, courseComplete });
});

/**
 * GET /groups/:groupId/analytics
 * Creator-only: completion count per lesson + overall stats.
 */
router.get("/groups/:groupId/analytics", async (req, res): Promise<void> => {
  const auth = getAuth(req);
  if (!auth?.userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const groupId = Number(req.params.groupId);
  const meId = await getInternalId(auth.userId);
  if (!meId) { res.status(404).json({ error: "User not found" }); return; }

  const [group] = await db
    .select({ creatorId: groupsTable.creatorId, name: groupsTable.name })
    .from(groupsTable)
    .where(eq(groupsTable.id, groupId))
    .limit(1);

  if (!group) { res.status(404).json({ error: "Group not found" }); return; }
  if (group.creatorId !== meId) { res.status(403).json({ error: "Creator only" }); return; }

  const lessons = await db
    .select({ id: lessonsTable.id, title: lessonsTable.title, position: lessonsTable.position })
    .from(lessonsTable)
    .where(and(eq(lessonsTable.groupId, groupId), eq(lessonsTable.isPublished, true)))
    .orderBy(asc(lessonsTable.position));

  const completionCounts = await db
    .select({
      lessonId: lessonCompletionsTable.lessonId,
      completions: count(),
    })
    .from(lessonCompletionsTable)
    .where(eq(lessonCompletionsTable.groupId, groupId))
    .groupBy(lessonCompletionsTable.lessonId);

  const countMap = Object.fromEntries(completionCounts.map(c => [c.lessonId, Number(c.completions)]));

  const [memberCount] = await db
    .select({ n: count() })
    .from(groupMembersTable)
    .where(eq(groupMembersTable.groupId, groupId));

  const totalMembers = Number((memberCount as any)?.n ?? 0);

  const lessonStats = lessons.map(l => ({
    ...l,
    completions: countMap[l.id] ?? 0,
    completionRate: totalMembers > 0 ? Math.round(((countMap[l.id] ?? 0) / totalMembers) * 100) : 0,
  }));

  res.json({ lessons: lessonStats, totalMembers });
});

/**
 * POST /groups/:groupId/lessons
 * Create a new lesson. Creator only.
 */
router.post("/groups/:groupId/lessons", async (req, res): Promise<void> => {
  const auth = getAuth(req);
  if (!auth?.userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const groupId = Number(req.params.groupId);
  if (!Number.isFinite(groupId) || groupId <= 0) { res.status(400).json({ error: "Invalid group id" }); return; }

  const meId = await getInternalId(auth.userId);
  if (!meId) { res.status(404).json({ error: "User not found" }); return; }

  const [group] = await db
    .select({ creatorId: groupsTable.creatorId, type: groupsTable.type })
    .from(groupsTable)
    .where(eq(groupsTable.id, groupId))
    .limit(1);

  if (!group || group.type !== "class") { res.status(404).json({ error: "Class not found" }); return; }
  if (group.creatorId !== meId) { res.status(403).json({ error: "Only the creator can add lessons." }); return; }

  const { title, body, videoUrl, attachmentUrl, position, isPublished, publishAt } = req.body as Record<string, any>;
  if (!title || typeof title !== "string" || !title.trim()) {
    res.status(400).json({ error: "title is required" });
    return;
  }

  let pos = typeof position === "number" ? position : null;
  if (pos === null) {
    const existing = await db
      .select({ position: lessonsTable.position })
      .from(lessonsTable)
      .where(eq(lessonsTable.groupId, groupId))
      .orderBy(asc(lessonsTable.position));
    pos = existing.length > 0 ? (existing[existing.length - 1]!.position + 1) : 0;
  }

  const [lesson] = await db
    .insert(lessonsTable)
    .values({
      groupId,
      title: title.trim(),
      body: typeof body === "string" ? body : null,
      videoUrl: typeof videoUrl === "string" && videoUrl.trim() ? videoUrl.trim() : null,
      attachmentUrl: typeof attachmentUrl === "string" && attachmentUrl.trim() ? attachmentUrl.trim() : null,
      position: pos,
      isPublished: typeof isPublished === "boolean" ? isPublished : true,
      publishAt: publishAt ? new Date(publishAt) : null,
    })
    .returning();

  res.status(201).json(lesson);
});

/**
 * PATCH /groups/:groupId/lessons/:lessonId
 * Update a lesson. Creator only.
 */
router.patch("/groups/:groupId/lessons/:lessonId", async (req, res): Promise<void> => {
  const auth = getAuth(req);
  if (!auth?.userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const groupId = Number(req.params.groupId);
  const lessonId = Number(req.params.lessonId);
  if (!Number.isFinite(groupId) || !Number.isFinite(lessonId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const meId = await getInternalId(auth.userId);
  if (!meId) { res.status(404).json({ error: "User not found" }); return; }

  const [group] = await db
    .select({ creatorId: groupsTable.creatorId })
    .from(groupsTable)
    .where(eq(groupsTable.id, groupId))
    .limit(1);

  if (!group) { res.status(404).json({ error: "Class not found" }); return; }
  if (group.creatorId !== meId) { res.status(403).json({ error: "Only the creator can edit lessons." }); return; }

  const { title, body, videoUrl, attachmentUrl, position, isPublished, publishAt } = req.body as Record<string, any>;
  const updates: Partial<typeof lessonsTable.$inferInsert> = {};
  if (typeof title === "string" && title.trim()) updates.title = title.trim();
  if (body !== undefined) updates.body = typeof body === "string" ? body : null;
  if (videoUrl !== undefined) updates.videoUrl = typeof videoUrl === "string" && videoUrl.trim() ? videoUrl.trim() : null;
  if (attachmentUrl !== undefined) updates.attachmentUrl = typeof attachmentUrl === "string" && attachmentUrl.trim() ? attachmentUrl.trim() : null;
  if (typeof position === "number") updates.position = position;
  if (typeof isPublished === "boolean") updates.isPublished = isPublished;
  if (publishAt !== undefined) updates.publishAt = publishAt ? new Date(publishAt) : null;

  const [lesson] = await db
    .update(lessonsTable)
    .set(updates)
    .where(and(eq(lessonsTable.id, lessonId), eq(lessonsTable.groupId, groupId)))
    .returning();

  if (!lesson) { res.status(404).json({ error: "Lesson not found" }); return; }
  res.json(lesson);
});

/**
 * DELETE /groups/:groupId/lessons/:lessonId
 * Delete a lesson. Creator only.
 */
router.delete("/groups/:groupId/lessons/:lessonId", async (req, res): Promise<void> => {
  const auth = getAuth(req);
  if (!auth?.userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const groupId = Number(req.params.groupId);
  const lessonId = Number(req.params.lessonId);
  if (!Number.isFinite(groupId) || !Number.isFinite(lessonId)) { res.status(400).json({ error: "Invalid id" }); return; }

  const meId = await getInternalId(auth.userId);
  if (!meId) { res.status(404).json({ error: "User not found" }); return; }

  const [group] = await db
    .select({ creatorId: groupsTable.creatorId })
    .from(groupsTable)
    .where(eq(groupsTable.id, groupId))
    .limit(1);

  if (!group) { res.status(404).json({ error: "Class not found" }); return; }
  if (group.creatorId !== meId) { res.status(403).json({ error: "Only the creator can delete lessons." }); return; }

  const [deleted] = await db
    .delete(lessonsTable)
    .where(and(eq(lessonsTable.id, lessonId), eq(lessonsTable.groupId, groupId)))
    .returning({ id: lessonsTable.id });

  if (!deleted) { res.status(404).json({ error: "Lesson not found" }); return; }
  res.json({ deleted: true });
});

export default router;
