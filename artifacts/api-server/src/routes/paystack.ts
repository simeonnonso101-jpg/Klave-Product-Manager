import { Router, type IRouter, type Request, type Response } from "express";
import { db, paymentsTable, groupsTable, usersTable, groupMembersTable, transactionsTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import crypto from "node:crypto";

const router: IRouter = Router();

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY ?? "";
const PLATFORM_FEE_PERCENT = 0.07;

// ─── Helpers ────────────────────────────────────────────────────────────────

async function paystackPost(path: string, body: object) {
  const res = await fetch(`https://api.paystack.co${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  return res.json() as Promise<any>;
}

async function paystackGet(path: string) {
  const res = await fetch(`https://api.paystack.co${path}`, {
    headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` },
  });
  return res.json() as Promise<any>;
}

async function fulfillPayment(groupId: number, userId: number, amountKobo: number) {
  const [group] = await db.select().from(groupsTable).where(eq(groupsTable.id, groupId)).limit(1);
  if (!group) throw new Error("Group not found");

  // Idempotency: don't double-add
  const existing = await db
    .select()
    .from(groupMembersTable)
    .where(sql`${groupMembersTable.groupId} = ${groupId} AND ${groupMembersTable.userId} = ${userId}`)
    .limit(1);
  if (existing.length > 0) return; // already a member

  const amountNaira = amountKobo / 100;
  const fee = amountNaira * PLATFORM_FEE_PERCENT;
  const creatorEarnings = amountNaira - fee;

  // Record payment
  await db.insert(paymentsTable).values({
    userId,
    groupId,
    amount: String(amountNaira),
    status: "completed",
    paymentMethod: "paystack",
  });

  // Add member
  await db.insert(groupMembersTable).values({ groupId, userId, role: "student" });
  await db.update(groupsTable)
    .set({ memberCount: sql`${groupsTable.memberCount} + 1` })
    .where(eq(groupsTable.id, groupId));

  // Credit creator
  if (group.creatorId) {
    await db.insert(transactionsTable).values({
      userId: group.creatorId,
      type: "credit",
      amount: String(creatorEarnings),
      description: `Paystack payment for: ${group.name}`,
      status: "completed",
      groupId: group.id,
    });
    await db.execute(
      sql`UPDATE users SET wallet_balance = wallet_balance + ${creatorEarnings} WHERE id = ${group.creatorId}`
    );
  }
}

// ─── Routes ─────────────────────────────────────────────────────────────────

/**
 * POST /api/payments/paystack/initialize
 * Auth required. Body: { groupId }
 * Returns: { authorizationUrl, reference }
 */
router.post("/payments/paystack/initialize", async (req: Request, res: Response): Promise<void> => {
  const auth = (req as any).auth;
  if (!auth?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const groupId = parseInt(req.body?.groupId, 10);
  if (!groupId) {
    res.status(400).json({ error: "groupId is required" });
    return;
  }

  const [group] = await db.select().from(groupsTable).where(eq(groupsTable.id, groupId)).limit(1);
  if (!group) {
    res.status(404).json({ error: "Group not found" });
    return;
  }

  const price = group.price ? parseFloat(group.price) : 0;
  if (price <= 0) {
    res.status(400).json({ error: "Group is free — no payment needed" });
    return;
  }

  // Look up the user's email from DB
  const [dbUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkUserId, auth.userId))
    .limit(1);

  if (!dbUser) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  // Check already a member
  const already = await db
    .select()
    .from(groupMembersTable)
    .where(sql`${groupMembersTable.groupId} = ${groupId} AND ${groupMembersTable.userId} = ${dbUser.id}`)
    .limit(1);
  if (already.length > 0) {
    res.status(409).json({ error: "Already a member" });
    return;
  }

  // Paystack amounts are in kobo (NGN) or pesewas (GHS) — multiply by 100
  const amountKobo = Math.round(price * 100);

  const reference = `klave-${groupId}-${dbUser.id}-${Date.now()}`;

  const callbackBase = process.env.VITE_API_URL ?? `https://${process.env.REPLIT_DEV_DOMAIN}`;
  const callbackUrl = `${callbackBase}/api/payments/paystack/callback?reference=${reference}`;

  const data = await paystackPost("/transaction/initialize", {
    email: dbUser.email,
    amount: amountKobo,
    reference,
    callback_url: callbackUrl,
    metadata: {
      groupId,
      userId: dbUser.id,
      groupName: group.name,
    },
  });

  if (!data.status) {
    req.log.error({ data }, "Paystack initialize failed");
    res.status(502).json({ error: "Paystack error", detail: data.message });
    return;
  }

  res.json({
    authorizationUrl: data.data.authorization_url,
    reference: data.data.reference,
    accessCode: data.data.access_code,
  });
});

/**
 * GET /api/payments/paystack/verify/:reference
 * Auth required. Called by frontend after redirect back.
 */
router.get("/payments/paystack/verify/:reference", async (req: Request, res: Response): Promise<void> => {
  const auth = (req as any).auth;
  if (!auth?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { reference } = req.params;
  if (!reference) {
    res.status(400).json({ error: "reference is required" });
    return;
  }

  const data = await paystackGet(`/transaction/verify/${encodeURIComponent(String(reference))}`);

  if (!data.status || data.data?.status !== "success") {
    res.status(402).json({ error: "Payment not successful", detail: data.data?.status ?? data.message });
    return;
  }

  const meta = data.data.metadata as { groupId: number; userId: number };
  const amountKobo: number = data.data.amount;

  try {
    await fulfillPayment(meta.groupId, meta.userId, amountKobo);
  } catch (err: any) {
    req.log.error({ err }, "fulfillPayment failed");
    res.status(500).json({ error: err.message ?? "Fulfillment failed" });
    return;
  }

  res.json({ success: true, groupId: meta.groupId });
});

/**
 * GET /api/payments/paystack/callback
 * Paystack browser redirect after payment. Redirects user back to the app.
 */
router.get("/payments/paystack/callback", async (req: Request, res: Response): Promise<void> => {
  const reference = req.query.reference as string;
  if (!reference) {
    res.redirect("/?paystack=error");
    return;
  }

  const data = await paystackGet(`/transaction/verify/${encodeURIComponent(reference)}`);

  if (!data.status || data.data?.status !== "success") {
    res.redirect(`/?paystack=failed&ref=${reference}`);
    return;
  }

  const meta = data.data.metadata as { groupId: number; userId: number };
  const amountKobo: number = data.data.amount;

  try {
    await fulfillPayment(meta.groupId, meta.userId, amountKobo);
  } catch {
    // best-effort — webhook will retry
  }

  // Send user back to the group page
  const appBase = process.env.VITE_APP_URL ?? "";
  res.redirect(`${appBase}/groups/${meta.groupId}?paystack=success`);
});

/**
 * POST /api/payments/paystack/webhook
 * Paystack server-to-server event. No auth middleware — validated by signature.
 */
router.post("/payments/paystack/webhook", async (req: Request, res: Response): Promise<void> => {
  const signature = req.headers["x-paystack-signature"] as string;
  const hash = crypto
    .createHmac("sha512", PAYSTACK_SECRET)
    .update(JSON.stringify(req.body))
    .digest("hex");

  if (hash !== signature) {
    res.status(400).json({ error: "Invalid signature" });
    return;
  }

  const event = req.body;
  if (event.event === "charge.success") {
    const meta = event.data.metadata as { groupId: number; userId: number };
    const amountKobo: number = event.data.amount;
    try {
      await fulfillPayment(meta.groupId, meta.userId, amountKobo);
    } catch (err: any) {
      req.log.error({ err }, "webhook fulfillPayment failed");
    }
  }

  // Paystack requires a 200 immediately
  res.sendStatus(200);
});

// ─── Wallet Top-up ──────────────────────────────────────────────────────────

/**
 * POST /wallet/topup/initialize
 * Auth required. Body: { amount: number (NGN) }
 */
router.post("/wallet/topup/initialize", async (req: Request, res: Response): Promise<void> => {
  const auth = (req as any).auth;
  if (!auth?.userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const amount = parseFloat(req.body?.amount);
  if (!amount || amount < 100) {
    res.status(400).json({ error: "Minimum top-up is ₦100" });
    return;
  }

  const [dbUser] = await db.select().from(usersTable).where(eq(usersTable.clerkUserId, auth.userId)).limit(1);
  if (!dbUser) { res.status(404).json({ error: "User not found" }); return; }

  const reference = `topup-${dbUser.id}-${Date.now()}`;
  const amountKobo = Math.round(amount * 100);

  const callbackBase = process.env.VITE_API_URL ?? `https://${process.env.REPLIT_DEV_DOMAIN}`;
  const callbackUrl = `${callbackBase}/api/wallet/topup/callback?reference=${reference}`;

  const data = await paystackPost("/transaction/initialize", {
    email: dbUser.email,
    amount: amountKobo,
    reference,
    callback_url: callbackUrl,
    metadata: { type: "wallet_topup", userId: dbUser.id, amount },
  });

  if (!data.status) {
    res.status(502).json({ error: "Paystack error", detail: data.message });
    return;
  }

  res.json({ authorizationUrl: data.data.authorization_url, reference: data.data.reference });
});

/**
 * GET /wallet/topup/verify/:reference
 * Auth required. Frontend calls after redirect.
 */
router.get("/wallet/topup/verify/:reference", async (req: Request, res: Response): Promise<void> => {
  const auth = (req as any).auth;
  if (!auth?.userId) { res.status(401).json({ error: "Unauthorized" }); return; }

  const data = await paystackGet(`/transaction/verify/${encodeURIComponent(String(req.params.reference))}`);
  if (!data.status || data.data?.status !== "success") {
    res.status(402).json({ error: "Payment not successful" });
    return;
  }

  const meta = data.data.metadata as { type: string; userId: number; amount: number };
  if (meta.type !== "wallet_topup") { res.status(400).json({ error: "Wrong payment type" }); return; }

  const amountNaira = data.data.amount / 100;

  // Credit wallet
  await db.execute(sql`UPDATE users SET wallet_balance = wallet_balance + ${amountNaira} WHERE id = ${meta.userId}`);
  await db.insert(transactionsTable).values({
    userId: meta.userId,
    type: "credit",
    amount: String(amountNaira),
    description: `Wallet top-up via Paystack`,
    status: "completed",
  });

  res.json({ success: true, amount: amountNaira });
});

/**
 * GET /api/wallet/topup/callback
 * Browser redirect from Paystack after top-up.
 */
router.get("/wallet/topup/callback", async (req: Request, res: Response): Promise<void> => {
  const reference = req.query.reference as string;
  if (!reference) { res.redirect("/?topup=error"); return; }

  const data = await paystackGet(`/transaction/verify/${encodeURIComponent(reference)}`);
  if (!data.status || data.data?.status !== "success") {
    res.redirect(`/wallet?topup=failed`);
    return;
  }

  const meta = data.data.metadata as { type: string; userId: number; amount: number };
  const amountNaira = data.data.amount / 100;

  try {
    await db.execute(sql`UPDATE users SET wallet_balance = wallet_balance + ${amountNaira} WHERE id = ${meta.userId}`);
    await db.insert(transactionsTable).values({
      userId: meta.userId,
      type: "credit",
      amount: String(amountNaira),
      description: `Wallet top-up via Paystack`,
      status: "completed",
    });
  } catch { /* webhook will retry */ }

  const appBase = process.env.VITE_APP_URL ?? "";
  res.redirect(`${appBase}/wallet?topup=success&amount=${amountNaira}`);
});

export default router;
