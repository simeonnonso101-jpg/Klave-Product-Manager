import { Router, type IRouter } from "express";
import { db, messagesTable, usersTable, groupMembersTable, groupsTable } from "@workspace/db";
import { eq, and, desc } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import {
  SendMessageBody,
  DeleteMessageParams,
  ListMessagesQueryParams,
  ListMessagesResponse,
} from "@workspace/api-zod";
import { broadcast, groupChannel } from "../lib/pusher";

const router: IRouter = Router();

/**
 * Resolve the authenticated app user from Clerk.
 * Returns null when unauthenticated or no matching app user exists.
 */
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

async function isGroupMember(userId: number, groupId: number): Promise<boolean> {
  const [m] = await db
    .select({ userId: groupMembersTable.userId })
    .from(groupMembersTable)
    .where(and(eq(groupMembersTable.userId, userId), eq(groupMembersTable.groupId, groupId)))
    .limit(1);
  return !!m;
}

router.get("/messages", async (req, res): Promise<void> => {
  const query = ListMessagesQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const limit = query.data.limit ?? 50;
  const msgs = await db.select({
    id: messagesTable.id,
    groupId: messagesTable.groupId,
    senderId: messagesTable.senderId,
    content: messagesTable.content,
    type: messagesTable.type,
    mediaUrl: messagesTable.mediaUrl,
    isReplicated: messagesTable.isReplicated,
    replicationJobId: messagesTable.replicationJobId,
    createdAt: messagesTable.createdAt,
    sender: {
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      role: usersTable.role,
      avatarUrl: usersTable.avatarUrl,
      bio: usersTable.bio,
      walletBalance: usersTable.walletBalance,
      createdAt: usersTable.createdAt,
    },
  }).from(messagesTable)
    .innerJoin(usersTable, eq(messagesTable.senderId, usersTable.id))
    .where(eq(messagesTable.groupId, query.data.groupId))
    .orderBy(messagesTable.createdAt)
    .limit(limit);
  const mapped = msgs.map((m) => ({
    ...m,
    mediaUrl: m.mediaUrl ?? null,
    replicationJobId: m.replicationJobId ?? null,
    sender: { ...m.sender, walletBalance: parseFloat(m.sender.walletBalance ?? "0"), avatarUrl: m.sender.avatarUrl ?? null, bio: m.sender.bio ?? null },
  }));
  res.json(ListMessagesResponse.parse(mapped));
});

router.post("/messages", async (req, res): Promise<void> => {
  const parsed = SendMessageBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  // Trust the authenticated session, never the client-supplied senderId.
  const authedUserId = await getAuthedUserId(req);
  if (!authedUserId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  // Membership gate so non-members can't post into groups they don't belong to.
  if (!(await isGroupMember(authedUserId, parsed.data.groupId))) {
    res.status(403).json({ error: "Not a member of this group" });
    return;
  }
  const [msg] = await db.insert(messagesTable).values({
    groupId: parsed.data.groupId,
    senderId: authedUserId,
    content: parsed.data.content,
    type: parsed.data.type ?? "text",
    mediaUrl: parsed.data.mediaUrl ?? null,
  }).returning();
  const [sender] = await db.select().from(usersTable).where(eq(usersTable.id, msg.senderId)).limit(1);
  const payload = {
    ...msg,
    mediaUrl: msg.mediaUrl ?? null,
    replicationJobId: msg.replicationJobId ?? null,
    sender: { ...sender, walletBalance: parseFloat(sender?.walletBalance ?? "0"), avatarUrl: sender?.avatarUrl ?? null, bio: sender?.bio ?? null },
  };
  // Fire-and-forget: broadcast to everyone subscribed to this group.
  void broadcast(groupChannel(msg.groupId), "message:new", payload);
  res.status(201).json(payload);
});

router.delete("/messages/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteMessageParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const authedUserId = await getAuthedUserId(req);
  if (!authedUserId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const [existing] = await db
    .select({ id: messagesTable.id, groupId: messagesTable.groupId, senderId: messagesTable.senderId })
    .from(messagesTable)
    .where(eq(messagesTable.id, params.data.id))
    .limit(1);
  if (!existing) {
    res.sendStatus(204);
    return;
  }
  // Allowed to delete if you're the sender, or you're the creator of the group.
  let allowed = existing.senderId === authedUserId;
  if (!allowed) {
    const [g] = await db
      .select({ creatorId: groupsTable.creatorId })
      .from(groupsTable)
      .where(eq(groupsTable.id, existing.groupId))
      .limit(1);
    allowed = g?.creatorId === authedUserId;
  }
  if (!allowed) {
    res.status(403).json({ error: "You can't delete this message" });
    return;
  }
  await db.delete(messagesTable).where(eq(messagesTable.id, params.data.id));
  void broadcast(groupChannel(existing.groupId), "message:deleted", {
    id: params.data.id,
  });
  res.sendStatus(204);
});

export default router;
