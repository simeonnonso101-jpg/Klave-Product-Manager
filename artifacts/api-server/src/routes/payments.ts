import { Router, type IRouter } from "express";
import { db, paymentsTable, groupsTable, usersTable, groupMembersTable, transactionsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import {
  CreatePaymentBody,
  ListPaymentsQueryParams,
  ListPaymentsResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

async function mapPayment(p: any) {
  const [group] = await db.select().from(groupsTable).where(eq(groupsTable.id, p.groupId)).limit(1);
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, p.userId)).limit(1);
  return {
    ...p,
    amount: parseFloat(p.amount ?? "0"),
    group: group ? {
      ...group,
      price: group.price != null ? parseFloat(group.price) : null,
      subscriptionModel: group.subscriptionModel ?? null,
      description: group.description ?? null,
      coverImageUrl: group.coverImageUrl ?? null,
      subject: group.subject ?? null,
    } : null,
    user: user ? {
      ...user,
      walletBalance: parseFloat(user.walletBalance ?? "0"),
      avatarUrl: user.avatarUrl ?? null,
      bio: user.bio ?? null,
    } : null,
  };
}

router.get("/payments", async (req, res): Promise<void> => {
  const query = ListPaymentsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  let payments;
  if (query.data.userId != null && query.data.groupId != null) {
    payments = await db.select().from(paymentsTable)
      .where(sql`${paymentsTable.userId} = ${query.data.userId} AND ${paymentsTable.groupId} = ${query.data.groupId}`)
      .orderBy(paymentsTable.createdAt);
  } else if (query.data.userId != null) {
    payments = await db.select().from(paymentsTable).where(eq(paymentsTable.userId, query.data.userId)).orderBy(paymentsTable.createdAt);
  } else if (query.data.groupId != null) {
    payments = await db.select().from(paymentsTable).where(eq(paymentsTable.groupId, query.data.groupId)).orderBy(paymentsTable.createdAt);
  } else {
    payments = await db.select().from(paymentsTable).orderBy(paymentsTable.createdAt);
  }
  const mapped = await Promise.all(payments.map(mapPayment));
  res.json(ListPaymentsResponse.parse(mapped));
});

router.post("/payments", async (req, res): Promise<void> => {
  const parsed = CreatePaymentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [group] = await db.select().from(groupsTable).where(eq(groupsTable.id, parsed.data.groupId)).limit(1);
  if (!group) {
    res.status(404).json({ error: "Group not found" });
    return;
  }
  const amount = group.price ? parseFloat(group.price) : 0;
  const [payment] = await db.insert(paymentsTable).values({
    userId: parsed.data.userId,
    groupId: parsed.data.groupId,
    amount: String(amount),
    status: "completed",
    paymentMethod: parsed.data.paymentMethod,
  }).returning();
  // Auto-add user to group
  const existing = await db.select().from(groupMembersTable)
    .where(sql`${groupMembersTable.groupId} = ${parsed.data.groupId} AND ${groupMembersTable.userId} = ${parsed.data.userId}`)
    .limit(1);
  if (existing.length === 0) {
    await db.insert(groupMembersTable).values({ groupId: parsed.data.groupId, userId: parsed.data.userId, role: "student" });
    await db.update(groupsTable).set({ memberCount: sql`${groupsTable.memberCount} + 1` }).where(eq(groupsTable.id, parsed.data.groupId));
  }
  // Log transaction for creator
  const fee = amount * 0.07; // 7% platform fee
  const creatorEarnings = amount - fee;
  if (group.creatorId) {
    await db.insert(transactionsTable).values({
      userId: group.creatorId,
      type: "credit",
      amount: String(creatorEarnings),
      description: `Payment from group: ${group.name}`,
      status: "completed",
      groupId: group.id,
    });
    // Update creator wallet
    await db.execute(sql`UPDATE users SET wallet_balance = wallet_balance + ${creatorEarnings} WHERE id = ${group.creatorId}`);
  }
  const result = await mapPayment(payment);
  res.status(201).json(result);
});

export default router;
