import { Router, type Request, type Response, type IRouter } from "express";
import { db, transactionsTable, paymentsTable, groupsTable, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import {
  GetWalletSummaryQueryParams,
  GetWalletSummaryResponse,
  ListTransactionsQueryParams,
  ListTransactionsResponse,
  WithdrawFundsBody,
} from "@workspace/api-zod";

const router: IRouter = Router();

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY ?? "";

async function paystackGet(path: string) {
  const r = await fetch(`https://api.paystack.co${path}`, {
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET}`, "Content-Type": "application/json" },
  });
  return r.json() as Promise<any>;
}

async function paystackPost(path: string, body: object) {
  const r = await fetch(`https://api.paystack.co${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return r.json() as Promise<any>;
}

router.get("/wallet/summary", async (req, res): Promise<void> => {
  const query = GetWalletSummaryQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }
  const creatorId = query.data.creatorId;
  const groups = await db.select().from(groupsTable).where(eq(groupsTable.creatorId, creatorId));
  const groupIds = groups.map((g) => g.id);

  let totalEarnings = 0;
  const earningsByGroup: any[] = [];

  for (const group of groups) {
    const payments = await db.select({ amount: paymentsTable.amount }).from(paymentsTable)
      .where(eq(paymentsTable.groupId, group.id));
    const groupRevenue = payments.reduce((acc, p) => acc + parseFloat(p.amount ?? "0"), 0);
    totalEarnings += groupRevenue * 0.93;
    earningsByGroup.push({
      groupId: group.id,
      groupName: group.name,
      totalRevenue: parseFloat((groupRevenue * 0.93).toFixed(2)),
      memberCount: group.memberCount,
    });
  }

  const withdrawals = await db.select({ amount: transactionsTable.amount }).from(transactionsTable)
    .where(sql`${transactionsTable.userId} = ${creatorId} AND ${transactionsTable.type} = 'withdrawal'`);
  const totalWithdrawn = withdrawals.reduce((acc, t) => acc + parseFloat(t.amount ?? "0"), 0);

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, creatorId)).limit(1);
  const availableBalance = parseFloat(user?.walletBalance ?? "0");

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

/**
 * GET /wallet/banks
 * Returns list of Nigerian banks from Paystack.
 */
router.get("/wallet/banks", async (req: Request, res: Response): Promise<void> => {
  try {
    const data = await paystackGet("/bank?country=nigeria&perPage=100");
    if (!data.status) {
      res.status(502).json({ error: "Could not fetch banks" });
      return;
    }
    const banks = (data.data as any[]).map((b: any) => ({ name: b.name, code: b.code }));
    res.json(banks);
  } catch (err) {
    res.status(502).json({ error: "Could not fetch banks" });
  }
});

/**
 * POST /wallet/resolve-account
 * Body: { accountNumber, bankCode }
 * Returns { accountName, accountNumber }
 */
router.post("/wallet/resolve-account", async (req: Request, res: Response): Promise<void> => {
  const { accountNumber, bankCode } = req.body ?? {};
  if (!accountNumber || !bankCode) {
    res.status(400).json({ error: "accountNumber and bankCode are required" });
    return;
  }
  try {
    const data = await paystackGet(
      `/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`
    );
    if (!data.status) {
      res.status(422).json({ error: data.message ?? "Could not resolve account" });
      return;
    }
    res.json({
      accountName: data.data.account_name,
      accountNumber: data.data.account_number,
    });
  } catch (err) {
    res.status(502).json({ error: "Could not resolve account" });
  }
});

/**
 * POST /wallet/withdraw
 * Auth required. Body: { userId, amount, accountNumber, bankCode, bankName, accountName }
 * Creates a Paystack transfer recipient and initiates a real bank transfer.
 */
router.post("/wallet/withdraw", async (req: Request, res: Response): Promise<void> => {
  const auth = getAuth(req);
  if (!auth?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const parsed = WithdrawFundsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { userId, amount, accountNumber, bankCode, bankName, accountName } = parsed.data;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  // Verify the logged-in user matches the userId
  if (user.clerkUserId !== auth.userId) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  const balance = parseFloat(user.walletBalance ?? "0");
  if (balance < amount) {
    res.status(400).json({ error: "Insufficient balance" });
    return;
  }

  // Step 1: Create a Paystack transfer recipient
  const recipientRes = await paystackPost("/transferrecipient", {
    type: "nuban",
    name: accountName,
    account_number: accountNumber,
    bank_code: bankCode,
    currency: "NGN",
  });

  if (!recipientRes.status) {
    req.log.error({ recipientRes }, "Failed to create transfer recipient");
    res.status(502).json({ error: recipientRes.message ?? "Could not create transfer recipient" });
    return;
  }

  const recipientCode = recipientRes.data.recipient_code as string;
  const amountKobo = Math.round(amount * 100);
  const transferRef = `klave-withdraw-${userId}-${Date.now()}`;

  // Step 2: Initiate the transfer
  const transferRes = await paystackPost("/transfer", {
    source: "balance",
    amount: amountKobo,
    recipient: recipientCode,
    reference: transferRef,
    reason: `Klave wallet withdrawal — ${accountName} (${bankName})`,
  });

  if (!transferRes.status) {
    req.log.error({ transferRes }, "Failed to initiate transfer");
    res.status(502).json({ error: transferRes.message ?? "Could not initiate transfer" });
    return;
  }

  const transferStatus = transferRes.data?.status as string; // "success" | "pending" | "otp"

  // Step 3: Deduct wallet balance and record transaction
  await db.execute(sql`UPDATE users SET wallet_balance = wallet_balance - ${amount} WHERE id = ${userId}`);

  const [txn] = await db.insert(transactionsTable).values({
    userId,
    type: "withdrawal",
    amount: String(amount),
    description: `Withdrawal to ${accountName} — ${bankName} (${accountNumber})`,
    status: transferStatus === "success" ? "completed" : "pending",
    reference: transferRef,
  }).returning();

  res.status(201).json({ ...txn, amount: parseFloat(txn.amount ?? "0"), groupId: null });
});

export default router;
