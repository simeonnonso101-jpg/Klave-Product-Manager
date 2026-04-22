import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq, ilike, or, ne, and, sql } from "drizzle-orm";
import { getAuth, clerkClient } from "@clerk/express";
import {
  CreateUserBody,
  GetUserParams,
  GetUserResponse,
  ListUsersResponse,
  GetCurrentUserResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/users", async (_req, res): Promise<void> => {
  const users = await db.select().from(usersTable).orderBy(usersTable.createdAt);
  const parsed = users.map((u) => ({
    ...u,
    walletBalance: parseFloat(u.walletBalance ?? "0"),
    avatarUrl: u.avatarUrl ?? null,
    bio: u.bio ?? null,
  }));
  res.json(ListUsersResponse.parse(parsed));
});

/**
 * Search users by name or email. Excludes the authenticated user from results
 * so the UI never offers "DM yourself". Returns at most 20 hits, ordered by
 * shortest name (rough proxy for closer match) then alphabetically.
 */
router.get("/users/search", async (req, res): Promise<void> => {
  const auth = getAuth(req);
  const clerkUserId = auth?.userId;
  if (!clerkUserId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const [me] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.clerkUserId, clerkUserId))
    .limit(1);

  const qRaw = String(req.query.q ?? "").trim();
  if (qRaw.length < 1) {
    res.json([]);
    return;
  }
  const needle = `%${qRaw}%`;

  const baseFilter = me
    ? and(
        ne(usersTable.id, me.id),
        or(ilike(usersTable.name, needle), ilike(usersTable.email, needle)),
      )
    : or(ilike(usersTable.name, needle), ilike(usersTable.email, needle));

  const rows = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      avatarUrl: usersTable.avatarUrl,
      role: usersTable.role,
    })
    .from(usersTable)
    .where(baseFilter)
    .orderBy(sql`length(${usersTable.name})`, usersTable.name)
    .limit(20);

  res.json(rows.map((r) => ({ ...r, avatarUrl: r.avatarUrl ?? null })));
});

router.get("/users/me", async (req, res): Promise<void> => {
  const auth = getAuth(req);
  const clerkUserId = auth?.userId;
  if (!clerkUserId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  let [user] = await db.select().from(usersTable).where(eq(usersTable.clerkUserId, clerkUserId)).limit(1);

  if (!user) {
    const clerkUser = await clerkClient.users.getUser(clerkUserId);
    const email = clerkUser.emailAddresses[0]?.emailAddress ?? `${clerkUserId}@klave.local`;
    const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || clerkUser.username || email.split("@")[0];

    const existingByEmail = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (existingByEmail[0]) {
      [user] = await db.update(usersTable).set({ clerkUserId }).where(eq(usersTable.id, existingByEmail[0].id)).returning();
    } else {
      [user] = await db.insert(usersTable).values({
        clerkUserId,
        name,
        email,
        role: "student",
        avatarUrl: clerkUser.imageUrl ?? null,
      }).returning();
    }
  }

  res.json(GetCurrentUserResponse.parse({ ...user, walletBalance: parseFloat(user.walletBalance ?? "0"), avatarUrl: user.avatarUrl ?? null, bio: user.bio ?? null }));
});

router.patch("/users/me", async (req, res): Promise<void> => {
  const auth = getAuth(req);
  const clerkUserId = auth?.userId;
  if (!clerkUserId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const body = req.body as { name?: string; bio?: string | null; avatarUrl?: string | null };
  const updates: { name?: string; bio?: string | null; avatarUrl?: string | null } = {};
  if (typeof body.name === "string" && body.name.trim().length > 0) updates.name = body.name.trim();
  if (body.bio !== undefined) updates.bio = body.bio;
  if (body.avatarUrl !== undefined) updates.avatarUrl = body.avatarUrl;

  const [user] = await db.update(usersTable).set(updates).where(eq(usersTable.clerkUserId, clerkUserId)).returning();
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(GetCurrentUserResponse.parse({ ...user, walletBalance: parseFloat(user.walletBalance ?? "0"), avatarUrl: user.avatarUrl ?? null, bio: user.bio ?? null }));
});

router.get("/users/:id", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const params = GetUserParams.safeParse({ id: raw });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, params.data.id)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(GetUserResponse.parse({ ...user, walletBalance: parseFloat(user.walletBalance ?? "0"), avatarUrl: user.avatarUrl ?? null, bio: user.bio ?? null }));
});

router.post("/users", async (req, res): Promise<void> => {
  const parsed = CreateUserBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [user] = await db.insert(usersTable).values(parsed.data).returning();
  res.status(201).json(GetUserResponse.parse({ ...user, walletBalance: parseFloat(user.walletBalance ?? "0"), avatarUrl: user.avatarUrl ?? null, bio: user.bio ?? null }));
});

export default router;
