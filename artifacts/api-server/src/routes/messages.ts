import { Router, type IRouter } from "express";
import { db, messagesTable, usersTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";
import {
  SendMessageBody,
  DeleteMessageParams,
  ListMessagesQueryParams,
  ListMessagesResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

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
  const [msg] = await db.insert(messagesTable).values({
    groupId: parsed.data.groupId,
    senderId: parsed.data.senderId,
    content: parsed.data.content,
    type: parsed.data.type ?? "text",
    mediaUrl: parsed.data.mediaUrl ?? null,
  }).returning();
  const [sender] = await db.select().from(usersTable).where(eq(usersTable.id, msg.senderId)).limit(1);
  res.status(201).json({
    ...msg,
    mediaUrl: msg.mediaUrl ?? null,
    replicationJobId: msg.replicationJobId ?? null,
    sender: { ...sender, walletBalance: parseFloat(sender?.walletBalance ?? "0"), avatarUrl: sender?.avatarUrl ?? null, bio: sender?.bio ?? null },
  });
});

router.delete("/messages/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = DeleteMessageParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  await db.delete(messagesTable).where(eq(messagesTable.id, params.data.id));
  res.sendStatus(204);
});

export default router;
