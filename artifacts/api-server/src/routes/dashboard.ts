import { Router, type IRouter } from "express";
import { db, groupsTable, groupMembersTable, paymentsTable, messagesTable, replicationJobsTable, usersTable } from "@workspace/db";
import { eq, sql, count } from "drizzle-orm";
import {
  GetCreatorDashboardParams,
  GetCreatorDashboardResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/dashboard/creator/:creatorId", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.creatorId) ? req.params.creatorId[0] : req.params.creatorId;
  const params = GetCreatorDashboardParams.safeParse({ creatorId: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const creatorId = params.data.creatorId;

  const groups = await db.select().from(groupsTable).where(eq(groupsTable.creatorId, creatorId));
  const groupIds = groups.map((g) => g.id);

  const activeGroups = groups.filter((g) => g.isActive).length;
  const totalGroups = groups.length;

  // Total students across all groups
  let totalStudents = 0;
  for (const gid of groupIds) {
    const [c] = await db.select({ count: count() }).from(groupMembersTable).where(eq(groupMembersTable.groupId, gid));
    totalStudents += c?.count ?? 0;
  }

  // Total earnings
  let totalEarnings = 0;
  if (groupIds.length > 0) {
    const payments = await db.select({ amount: paymentsTable.amount }).from(paymentsTable)
      .where(sql`${paymentsTable.groupId} = ANY(ARRAY[${sql.raw(groupIds.join(","))}]::int[])`);
    totalEarnings = payments.reduce((acc, p) => acc + parseFloat(p.amount ?? "0") * 0.93, 0);
  }

  // Recent payments
  const recentPaymentsRaw = groupIds.length > 0
    ? await db.select().from(paymentsTable)
        .where(sql`${paymentsTable.groupId} = ANY(ARRAY[${sql.raw(groupIds.join(","))}]::int[])`)
        .orderBy(paymentsTable.createdAt)
        .limit(5)
    : [];

  const recentPayments = await Promise.all(recentPaymentsRaw.map(async (p) => {
    const [group] = await db.select().from(groupsTable).where(eq(groupsTable.id, p.groupId)).limit(1);
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, p.userId)).limit(1);
    return {
      ...p,
      amount: parseFloat(p.amount ?? "0"),
      group: group ? { ...group, price: group.price != null ? parseFloat(group.price) : null, subscriptionModel: group.subscriptionModel ?? null, description: group.description ?? null, coverImageUrl: group.coverImageUrl ?? null, subject: group.subject ?? null } : null,
      user: user ? { ...user, walletBalance: parseFloat(user.walletBalance ?? "0"), avatarUrl: user.avatarUrl ?? null, bio: user.bio ?? null } : null,
    };
  }));

  // Recent messages in creator's groups
  const recentMessagesRaw = groupIds.length > 0
    ? await db.select({
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
        .where(sql`${messagesTable.groupId} = ANY(ARRAY[${sql.raw(groupIds.join(","))}]::int[])`)
        .orderBy(messagesTable.createdAt)
        .limit(5)
    : [];

  const recentMessages = recentMessagesRaw.map((m) => ({
    ...m,
    mediaUrl: m.mediaUrl ?? null,
    replicationJobId: m.replicationJobId ?? null,
    sender: { ...m.sender, walletBalance: parseFloat(m.sender.walletBalance ?? "0"), avatarUrl: m.sender.avatarUrl ?? null, bio: m.sender.bio ?? null },
  }));

  // Replication jobs
  const replicationJobsRaw = await db.select().from(replicationJobsTable)
    .where(eq(replicationJobsTable.creatorId, creatorId))
    .orderBy(replicationJobsTable.createdAt)
    .limit(5);
  const replicationJobs = replicationJobsRaw.map((j) => ({
    ...j,
    targetGroupIds: JSON.parse(j.targetGroupIds ?? "[]"),
  }));

  res.json(GetCreatorDashboardResponse.parse({
    creatorId,
    totalEarnings: parseFloat(totalEarnings.toFixed(2)),
    totalStudents,
    activeGroups,
    totalGroups,
    recentPayments,
    recentMessages,
    replicationJobs,
  }));
});

export default router;
