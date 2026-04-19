import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
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

router.get("/users/me", async (_req, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, 1)).limit(1);
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
