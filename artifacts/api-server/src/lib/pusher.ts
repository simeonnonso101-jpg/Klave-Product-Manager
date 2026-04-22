import Pusher from "pusher";
import { logger } from "./logger";

const appId = process.env.PUSHER_APP_ID;
const key = process.env.PUSHER_KEY;
const secret = process.env.PUSHER_SECRET;
const cluster = process.env.PUSHER_CLUSTER;

let pusher: Pusher | null = null;

if (appId && key && secret && cluster) {
  pusher = new Pusher({
    appId,
    key,
    secret,
    cluster,
    useTLS: true,
  });
  logger.info({ cluster }, "Pusher initialised");
} else {
  logger.warn(
    "Pusher env vars missing (PUSHER_APP_ID / PUSHER_KEY / PUSHER_SECRET / PUSHER_CLUSTER). Realtime events disabled.",
  );
}

export function groupChannel(groupId: number): string {
  return `private-group-${groupId}`;
}

/**
 * Best-effort broadcast. Never throws — realtime is non-critical, the API
 * response is the source of truth and clients also poll as a fallback.
 */
export async function broadcast(
  channel: string,
  event: string,
  payload: unknown,
): Promise<void> {
  if (!pusher) return;
  try {
    await pusher.trigger(channel, event, payload);
  } catch (err) {
    logger.error({ err, channel, event }, "Pusher broadcast failed");
  }
}

export function authorizeChannel(
  socketId: string,
  channel: string,
): { auth: string } | null {
  if (!pusher) return null;
  return pusher.authorizeChannel(socketId, channel);
}

export const isPusherEnabled = () => pusher !== null;
