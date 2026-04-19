import { Router, type IRouter } from "express";
import { db, transactionsTable, paymentsTable, groupsTable, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import {
  GetWalletSummaryQueryParams,
  GetWalletSummaryResponse,
  ListTransactionsQueryParams,
  ListTransactionsResponse,
  WithdrawFundsBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/wallet/summary", async (req, res): Promise<void> => {
  const query = GetWalletSummaryQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const creatorId = query.data.creatorId;
  // Get all groups for creator
  const groups = await db.select().from(groupsTable).where(eq(groupsTable.creatorId, creatorId));
  const groupIds = groups.map((g) => g.id);

  let totalEarnings = 0;
  let totalWithdrawn = 0;
  const earningsByGroup: any[] = [];

  for (const group of groups) {
    const payments = await db.select({ amount: paymentsTable.amount }).from(paymentsTable)
      .where(eq(paymentsTable.groupId, group.id));
    const groupRevenue = payments.reduce((acc, p) => acc + parseFloat(p.amount ?? "0"), 0);
    totalEarnings += groupRevenue * 0.93; // after 7% fee
    earningsByGroup.push({
      groupId: group.id,
      groupName: group.name,
      totalRevenue: parseFloat((groupRevenue * 0.93).toFixed(2)),
      memberCount: group.memberCount,
    });
  }

  // Get withdrawals
  const withdrawals = await db.select({ amount: transactionsTable.amount }).from(transactionsTable)
    .where(sql`${transactionsTable.userId} = ${creatorId} AND ${transactionsTable.type} = 'withdrawal'`);
  totalWithdrawn = withdrawals.reduce((acc, t) => acc + parseFloat(t.amount ?? "0"), 0);

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, creatorId)).limit(1);
  const availableBalance = parseFloat(user?.walletBalance ?? "0");

  // Monthly earnings (last 6 months)
  let monthlyData: { rows: any[] } = { rows: [] };
  if (groupIds.length > 0) {
    monthlyData = await db.execute(sql`
      SELECT TO_CHAR(created_at, 'YYYY-MM') as month, SUM(amount::numeric * 0.93) as total
      FROM payments
      WHERE group_id = ANY(ARRAY[${sql.raw(groupIds.join(","))}]::int[])
      AND created_at >= NOW() - INTERVAL '6 months'
      GROUP BY month
      ORDER BY month
    `);
  }

  const monthlyEarnings = (monthlyData.rows as any[]).map((r) => ({
    month: r.month,
    total: parseFloat(parseFloat(r.total ?? "0").toFixed(2)),
  }));

  res.json(GetWalletSummaryResponse.parse({
    creatorId,
    totalEarnings: parseFloat(totalEarnings.toFixed(2)),
    availableBalance,
    pendingBalance: 0,
    totalWithdrawn: parseFloat(totalWithdrawn.toFixed(2)),
    earningsByGroup,
    monthlyEarnings,
  }));
});

router.get("/wallet/transactions", async (req, res): Promise<void> => {
  const query = ListTransactionsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const txns = await db.select().from(transactionsTable)
    .where(eq(transactionsTable.userId, query.data.userId))
    .orderBy(transactionsTable.createdAt);
  const mapped = txns.map((t) => ({
    ...t,
    amount: parseFloat(t.amount ?? "0"),
    groupId: t.groupId ?? null,
  }));
  res.json(ListTransactionsResponse.parse(mapped));
});

router.post("/wallet/withdraw", async (req, res): Promise<void> => {
  const parsed = WithdrawFundsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, parsed.data.userId)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const balance = parseFloat(user.walletBalance ?? "0");
  if (balance < parsed.data.amount) {
    res.status(400).json({ error: "Insufficient balance" });
    return;
  }
  const [txn] = await db.insert(transactionsTable).values({
    userId: parsed.data.userId,
    type: "withdrawal",
    amount: String(parsed.data.amount),
    description: `Withdrawal to: ${parsed.data.bankDetails}`,
    status: "pending",
  }).returning();
  // Deduct from wallet
  await db.execute(sql`UPDATE users SET wallet_balance = wallet_balance - ${parsed.data.amount} WHERE id = ${parsed.data.userId}`);
  res.status(201).json({ ...txn, amount: parseFloat(txn.amount ?? "0"), groupId: null });
});

export default router;
