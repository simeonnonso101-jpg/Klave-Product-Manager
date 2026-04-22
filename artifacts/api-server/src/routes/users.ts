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

  // Strip a leading "@" so users can naturally search "@ada" for an @username.
  const cleaned = qRaw.replace(/^@+/, "").trim();
  const usernameNeedle = `%${cleaned}%`;

  const matchClause = or(
    ilike(usersTable.name, needle),
    ilike(usersTable.email, needle),
    ilike(usersTable.username, usernameNeedle),
  );
  const baseFilter = me
    ? and(ne(usersTable.id, me.id), matchClause)
    : matchClause;

  const rows = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      username: usersTable.username,
      email: usersTable.email,
      avatarUrl: usersTable.avatarUrl,
      role: usersTable.role,
    })
    .from(usersTable)
    .where(baseFilter)
    .orderBy(sql`length(${usersTable.name})`, usersTable.name)
    .limit(20);

  res.json(rows.map((r) => ({ ...r, avatarUrl: r.avatarUrl ?? null, username: r.username ?? null })));
});

/**
 * Username availability check used by the profile/onboarding UI to give
 * instant feedback before the user submits. We accept the same characters as
 * the PATCH validator and treat case-insensitively, matching the unique index
 * defined in runtimeMigrations.ts.
 */
const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;
router.get("/users/check-username", async (req, res): Promise<void> => {
  const auth = getAuth(req);
  const clerkUserId = auth?.userId;
  if (!clerkUserId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const u = String(req.query.u ?? "").trim();
  if (!USERNAME_RE.test(u)) {
    res.json({ available: false, reason: "invalid" });
    return;
  }
  // A user reserving their own current username should still see "available".
  const [me] = await db
    .select({ id: usersTable.id, username: usersTable.username })
    .from(usersTable)
    .where(eq(usersTable.clerkUserId, clerkUserId))
    .limit(1);
  if (me?.username && me.username.toLowerCase() === u.toLowerCase()) {
    res.json({ available: true, reason: "self" });
    return;
  }
  const [conflict] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(sql`LOWER(${usersTable.username}) = LOWER(${u})`)
    .limit(1);
  res.json({ available: !conflict, reason: conflict ? "taken" : "ok" });
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

  // Sync Clerk's avatar back to our DB if the user changed it in Clerk's
  // managed profile UI. Cheap (single UPDATE) and keeps the search list and
  // chat headers in sync automatically.
  try {
    const clerkUser = await clerkClient.users.getUser(clerkUserId);
    if (clerkUser.imageUrl && clerkUser.imageUrl !== user.avatarUrl) {
      const [refreshed] = await db
        .update(usersTable)
        .set({ avatarUrl: clerkUser.imageUrl })
        .where(eq(usersTable.id, user.id))
        .returning();
      if (refreshed) user = refreshed;
    }
  } catch {
    // Non-fatal — fall through with whatever's in the DB.
  }

  const parsed = GetCurrentUserResponse.parse({ ...user, walletBalance: parseFloat(user.walletBalance ?? "0"), avatarUrl: user.avatarUrl ?? null, bio: user.bio ?? null });
  // username is not yet in the generated schema; attach it manually so the
  // client can read it without a full openapi regen.
  res.json({ ...parsed, username: (user as any).username ?? null });
});

router.patch("/users/me", async (req, res): Promise<void> => {
  const auth = getAuth(req);
  const clerkUserId = auth?.userId;
  if (!clerkUserId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const body = req.body as { name?: string; bio?: string | null; avatarUrl?: string | null; username?: string | null; role?: string };
  const updates: { name?: string; bio?: string | null; avatarUrl?: string | null; username?: string | null; role?: string } = {};
  if (typeof body.name === "string" && body.name.trim().length > 0) updates.name = body.name.trim();
  if (body.bio !== undefined) updates.bio = body.bio;
  if (body.avatarUrl !== undefined) updates.avatarUrl = body.avatarUrl;
  if (body.role === "creator" || body.role === "student") updates.role = body.role;

  if (body.username !== undefined) {
    if (body.username === null || body.username === "") {
      updates.username = null;
    } else {
      const u = String(body.username).trim();
      if (!USERNAME_RE.test(u)) {
        res.status(400).json({ error: "Username must be 3–20 characters, letters, numbers or underscore." });
        return;
      }
      updates.username = u;
    }
  }

  let user;
  try {
    [user] = await db.update(usersTable).set(updates).where(eq(usersTable.clerkUserId, clerkUserId)).returning();
  } catch (err: any) {
    // Postgres unique violation = 23505. Surface a friendly 409 instead of 500.
    if (err?.code === "23505" && String(err?.constraint_name ?? err?.constraint ?? "").includes("username")) {
      res.status(409).json({ error: "That username is taken." });
      return;
    }
    throw err;
  }

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  const parsed = GetCurrentUserResponse.parse({ ...user, walletBalance: parseFloat(user.walletBalance ?? "0"), avatarUrl: user.avatarUrl ?? null, bio: user.bio ?? null });
  res.json({ ...parsed, username: (user as any).username ?? null });
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
