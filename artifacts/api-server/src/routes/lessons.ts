import { Router, type IRouter } from "express";
import { db, lessonsTable, groupsTable, groupMembersTable, usersTable } from "@workspace/db";
import { and, eq, asc } from "drizzle-orm";
import { getAuth } from "@clerk/express";

const router: IRouter = Router();

/**
 * Helper: resolve a Clerk userId → internal numeric user id.
 * Returns null if the user doesn't exist in our DB (shouldn't happen for
 * authenticated users, but guards against race conditions on first login).
 */
async function getInternalId(clerkUserId: string): Promise<number | null> {
  const [u] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.clerkUserId, clerkUserId))
    .limit(1);
  return u?.id ?? null;
}

/**
 * GET /groups/:groupId/lessons
 *
 * List published lessons for a class.
 * - Members + creator see all published lessons.
 * - Non-members get 403 for paid classes so the detail page can prompt them
 *   to join; free classes show a preview (first 3 lessons) to entice sign-up.
 * - Unauthenticated callers always see the preview for free classes.
 */
router.get("/groups/:groupId/lessons", async (req, res): Promise<void> => {
  const groupId = Number(req.params.groupId);
  if (!Number.isFinite(groupId) || groupId <= 0) {
    res.status(400).json({ error: "Invalid group id" });
    return;
  }

  const [group] = await db
    .select({ id: groupsTable.id, type: groupsTable.type, price: groupsTable.price, creatorId: groupsTable.creatorId, isActive: groupsTable.isActive })
    .from(groupsTable)
    .where(eq(groupsTable.id, groupId))
    .limit(1);

  if (!group || group.type !== "class" || !group.isActive) {
    res.status(404).json({ error: "Class not found" });
    return;
  }

  const auth = getAuth(req);
  let meId: number | null = null;
  if (auth?.userId) {
    meId = await getInternalId(auth.userId);
  }

  const isPaid = group.price != null && parseFloat(group.price) > 0;
  const isCreator = meId != null && meId === group.creatorId;

  // Check membership only for paid classes (or to decide full vs. preview).
  let isMember = isCreator;
  if (!isMember && meId != null) {
    const [membership] = await db
      .select({ id: groupMembersTable.id })
      .from(groupMembersTable)
      .where(and(eq(groupMembersTable.groupId, groupId), eq(groupMembersTable.userId, meId)))
      .limit(1);
    isMember = !!membership;
  }

  if (isPaid && !isMember) {
    res.status(403).json({ error: "Join this class to access lessons." });
    return;
  }

  const rows = await db
    .select()
    .from(lessonsTable)
    .where(and(eq(lessonsTable.groupId, groupId), eq(lessonsTable.isPublished, true)))
    .orderBy(asc(lessonsTable.position), asc(lessonsTable.createdAt));

  // For free classes where the caller isn't a member, show first 3 as a
  // teaser. Signed-in members always get everything.
  const preview = !isMember && !isPaid;
  res.json({ lessons: preview ? rows.slice(0, 3) : rows, isPreview: preview, total: rows.length });
});

/**
 * GET /groups/:groupId/lessons/:lessonId
 *
 * Fetch a single lesson. Access rules mirror the list endpoint.
 */
router.get("/groups/:groupId/lessons/:lessonId", async (req, res): Promise<void> => {
  const groupId = Number(req.params.groupId);
  const lessonId = Number(req.params.lessonId);
  if (!Number.isFinite(groupId) || !Number.isFinite(lessonId)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [group] = await db
    .select({ price: groupsTable.price, creatorId: groupsTable.creatorId, type: groupsTable.type, isActive: groupsTable.isActive })
    .from(groupsTable)
    .where(eq(groupsTable.id, groupId))
    .limit(1);

  if (!group || group.type !== "class" || !group.isActive) {
    res.status(404).json({ error: "Class not found" });
    return;
  }

  const auth = getAuth(req);
  let meId: number | null = null;
  if (auth?.userId) meId = await getInternalId(auth.userId);

  const isPaid = group.price != null && parseFloat(group.price) > 0;
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

  if (isPaid && !isMember) {
    res.status(403).json({ error: "Join this class to access lessons." });
    return;
  }

  const [lesson] = await db
    .select()
    .from(lessonsTable)
    .where(and(eq(lessonsTable.id, lessonId), eq(lessonsTable.groupId, groupId)))
    .limit(1);

  if (!lesson || (!isCreator && !lesson.isPublished)) {
    res.status(404).json({ error: "Lesson not found" });
    return;
  }

  // Fetch neighbouring lessons for prev/next navigation.
  const siblings = await db
    .select({ id: lessonsTable.id, title: lessonsTable.title, position: lessonsTable.position })
    .from(lessonsTable)
    .where(and(eq(lessonsTable.groupId, groupId), eq(lessonsTable.isPublished, true)))
    .orderBy(asc(lessonsTable.position), asc(lessonsTable.createdAt));

  const idx = siblings.findIndex((s) => s.id === lesson.id);
  const prev = idx > 0 ? siblings[idx - 1] : null;
  const next = idx < siblings.length - 1 ? siblings[idx + 1] : null;

  res.json({ lesson, prev, next, isCreator });
});

/**
 * POST /groups/:groupId/lessons
 *
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

  const { title, body, videoUrl, attachmentUrl, position, isPublished } = req.body as Record<string, any>;
  if (!title || typeof title !== "string" || !title.trim()) {
    res.status(400).json({ error: "title is required" });
    return;
  }

  // Default position: append after the last existing lesson.
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
    })
    .returning();

  res.status(201).json(lesson);
});

/**
 * PATCH /groups/:groupId/lessons/:lessonId
 *
 * Update an existing lesson. Creator only.
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

  const { title, body, videoUrl, attachmentUrl, position, isPublished } = req.body as Record<string, any>;
  const updates: Partial<typeof lessonsTable.$inferInsert> = {};
  if (typeof title === "string" && title.trim()) updates.title = title.trim();
  if (body !== undefined) updates.body = typeof body === "string" ? body : null;
  if (videoUrl !== undefined) updates.videoUrl = typeof videoUrl === "string" && videoUrl.trim() ? videoUrl.trim() : null;
  if (attachmentUrl !== undefined) updates.attachmentUrl = typeof attachmentUrl === "string" && attachmentUrl.trim() ? attachmentUrl.trim() : null;
  if (typeof position === "number") updates.position = position;
  if (typeof isPublished === "boolean") updates.isPublished = isPublished;

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
 *
 * Delete a lesson. Creator only. Permanent.
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
