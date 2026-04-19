import { Router, type IRouter } from "express";
import { db, groupsTable, groupMembersTable, usersTable, messagesTable, paymentsTable } from "@workspace/db";
import { eq, count, sql } from "drizzle-orm";
import {
  CreateGroupBody,
  UpdateGroupBody,
  UpdateGroupParams,
  GetGroupParams,
  GetGroupResponse,
  ListGroupsResponse,
  UpdateGroupResponse,
  AddGroupMemberBody,
  AddGroupMemberParams,
  ListGroupMembersResponse,
  GetGroupStatsParams,
  GetGroupStatsResponse,
  ListGroupsQueryParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function mapGroup(g: any) {
  return {
    ...g,
    price: g.price != null ? parseFloat(g.price) : null,
    subscriptionModel: g.subscriptionModel ?? null,
    description: g.description ?? null,
    coverImageUrl: g.coverImageUrl ?? null,
    subject: g.subject ?? null,
  };
}

router.get("/groups", async (req, res): Promise<void> => {
  const query = ListGroupsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const conditions = [];
  if (query.data.creatorId != null) {
    conditions.push(eq(groupsTable.creatorId, query.data.creatorId));
  }
  if (query.data.type != null) {
    conditions.push(eq(groupsTable.type, query.data.type));
  }
  if ((query.data as any).memberId != null) {
    const memberId = (query.data as any).memberId as number;
    conditions.push(sql`${groupsTable.id} IN (SELECT group_id FROM group_members WHERE user_id = ${memberId})`);
  }
  const groups = conditions.length > 0
    ? await db.select().from(groupsTable).where(sql`${conditions.map((c) => sql`(${c})`).reduce((a, b) => sql`${a} AND ${b}`)}`)
    : await db.select().from(groupsTable);
  res.json(ListGroupsResponse.parse(groups.map(mapGroup)));
});

router.post("/groups", async (req, res): Promise<void> => {
  const parsed = CreateGroupBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [group] = await db.insert(groupsTable).values({
    ...parsed.data,
    price: parsed.data.price != null ? String(parsed.data.price) : null,
    subscriptionModel: parsed.data.subscriptionModel ?? null,
  }).returning();
  // Add creator as member
  await db.insert(groupMembersTable).values({ groupId: group.id, userId: group.creatorId, role: "creator" });
  res.status(201).json(GetGroupResponse.parse(mapGroup(group)));
});

router.get("/groups/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetGroupParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [group] = await db.select().from(groupsTable).where(eq(groupsTable.id, params.data.id)).limit(1);
  if (!group) {
    res.status(404).json({ error: "Group not found" });
    return;
  }
  res.json(GetGroupResponse.parse(mapGroup(group)));
});

router.patch("/groups/:id", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = UpdateGroupParams.safeParse({ id: rawId });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateGroupBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const updateData: Record<string, any> = {};
  if (parsed.data.name != null) updateData.name = parsed.data.name;
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
  if (parsed.data.price !== undefined) updateData.price = parsed.data.price != null ? String(parsed.data.price) : null;
  if (parsed.data.subscriptionModel !== undefined) updateData.subscriptionModel = parsed.data.subscriptionModel;
  if (parsed.data.isActive != null) updateData.isActive = parsed.data.isActive;
  if (parsed.data.coverImageUrl !== undefined) updateData.coverImageUrl = parsed.data.coverImageUrl;
  if (parsed.data.subject !== undefined) updateData.subject = parsed.data.subject;
  const [group] = await db.update(groupsTable).set(updateData).where(eq(groupsTable.id, params.data.id)).returning();
  if (!group) {
    res.status(404).json({ error: "Group not found" });
    return;
  }
  res.json(UpdateGroupResponse.parse(mapGroup(group)));
});

router.get("/groups/:id/members", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = AddGroupMemberParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const members = await db.select({
    id: groupMembersTable.id,
    groupId: groupMembersTable.groupId,
    userId: groupMembersTable.userId,
    role: groupMembersTable.role,
    joinedAt: groupMembersTable.joinedAt,
    user: {
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      role: usersTable.role,
      avatarUrl: usersTable.avatarUrl,
      bio: usersTable.bio,
      walletBalance: usersTable.walletBalance,
      createdAt: usersTable.createdAt,
    },
  }).from(groupMembersTable)
    .innerJoin(usersTable, eq(groupMembersTable.userId, usersTable.id))
    .where(eq(groupMembersTable.groupId, params.data.id));
  const mapped = members.map((m) => ({
    ...m,
    user: { ...m.user, walletBalance: parseFloat(m.user.walletBalance ?? "0"), avatarUrl: m.user.avatarUrl ?? null, bio: m.user.bio ?? null },
  }));
  res.json(ListGroupMembersResponse.parse(mapped));
});

router.post("/groups/:id/members", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = AddGroupMemberParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = AddGroupMemberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [member] = await db.insert(groupMembersTable).values({ groupId: params.data.id, userId: parsed.data.userId, role: parsed.data.role ?? "student" }).returning();
  // Update member count
  await db.update(groupsTable).set({ memberCount: sql`${groupsTable.memberCount} + 1` }).where(eq(groupsTable.id, params.data.id));
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, member.userId)).limit(1);
  res.status(201).json({
    ...member,
    user: { ...user, walletBalance: parseFloat(user?.walletBalance ?? "0"), avatarUrl: user?.avatarUrl ?? null, bio: user?.bio ?? null },
  });
});

router.get("/groups/:id/stats", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetGroupStatsParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [memberCount] = await db.select({ count: count() }).from(groupMembersTable).where(eq(groupMembersTable.groupId, params.data.id));
  const [msgCount] = await db.select({ count: count() }).from(messagesTable).where(eq(messagesTable.groupId, params.data.id));
  const payments = await db.select({ amount: paymentsTable.amount }).from(paymentsTable).where(eq(paymentsTable.groupId, params.data.id));
  const totalRevenue = payments.reduce((acc, p) => acc + parseFloat(p.amount ?? "0"), 0);
  res.json(GetGroupStatsResponse.parse({
    groupId: params.data.id,
    memberCount: memberCount?.count ?? 0,
    totalRevenue,
    messageCount: msgCount?.count ?? 0,
    activeMembers: memberCount?.count ?? 0,
  }));
});

export default router;
