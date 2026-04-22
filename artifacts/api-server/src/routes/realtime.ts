import { Router, type IRouter } from "express";
import { getAuth } from "@clerk/express";
import { db, usersTable, groupMembersTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { authorizeChannel, isPusherEnabled } from "../lib/pusher";

const router: IRouter = Router();

/**
 * Pusher private-channel authentication endpoint.
 *
 * pusher-js POSTs `socket_id` and `channel_name` here whenever a client
 * tries to subscribe to a `private-*` channel. We authenticate the request
 * via Clerk, verify the user is actually a member of the requested group,
 * and only then return the signed auth token Pusher requires.
 */
router.post("/pusher/auth", async (req, res): Promise<void> => {
  if (!isPusherEnabled()) {
    res.status(503).json({ error: "Realtime not configured" });
    return;
  }

  const auth = getAuth(req);
  const clerkUserId = auth?.userId;
  if (!clerkUserId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }

  const socketId = String(req.body?.socket_id ?? "");
  const channelName = String(req.body?.channel_name ?? "");
  // Strict canonical match — reject "private-group-1-foo" and any other variants.
  const channelMatch = /^private-group-(\d+)$/.exec(channelName);
  if (!socketId || !channelMatch) {
    res.status(400).json({ error: "Bad channel" });
    return;
  }
  const groupId = parseInt(channelMatch[1], 10);

  // Look up app user from Clerk id
  const [user] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.clerkUserId, clerkUserId))
    .limit(1);
  if (!user) {
    res.status(403).json({ error: "Unknown user" });
    return;
  }

  // Verify membership
  const [member] = await db
    .select({ userId: groupMembersTable.userId })
    .from(groupMembersTable)
    .where(
      and(
        eq(groupMembersTable.groupId, groupId),
        eq(groupMembersTable.userId, user.id),
      ),
    )
    .limit(1);
  if (!member) {
    res.status(403).json({ error: "Not a member of this group" });
    return;
  }

  const authResponse = authorizeChannel(socketId, channelName);
  if (!authResponse) {
    res.status(503).json({ error: "Realtime not configured" });
    return;
  }
  res.json(authResponse);
});

export default router;
