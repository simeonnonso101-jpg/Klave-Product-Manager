import Pusher from "pusher-js";

const PUSHER_KEY = import.meta.env.VITE_PUSHER_KEY as string | undefined;
const PUSHER_CLUSTER = import.meta.env.VITE_PUSHER_CLUSTER as string | undefined;
const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "";

let client: Pusher | null = null;
let currentTokenGetter: (() => Promise<string | null>) | null = null;

/**
 * Provide the auth-token getter (Clerk's getToken) so private channel
 * subscriptions can authenticate against the API.
 *
 * Called from ApiAuthBridge in App.tsx after Clerk loads.
 */
export function setPusherTokenGetter(
  getter: (() => Promise<string | null>) | null,
): void {
  currentTokenGetter = getter;
}

export function getPusher(): Pusher | null {
  if (!PUSHER_KEY || !PUSHER_CLUSTER) {
    if (typeof window !== "undefined") {
      console.warn(
        "[pusher] VITE_PUSHER_KEY / VITE_PUSHER_CLUSTER missing — realtime disabled.",
      );
    }
    return null;
  }
  if (client) return client;

  client = new Pusher(PUSHER_KEY, {
    cluster: PUSHER_CLUSTER,
    forceTLS: true,
    // Custom authorizer: attach Clerk JWT to the auth request.
    authorizer: (channel) => ({
      authorize: async (socketId, callback) => {
        try {
          const token = currentTokenGetter ? await currentTokenGetter() : null;
          const res = await fetch(`${API_URL}/api/pusher/auth`, {
            method: "POST",
            headers: {
              "Content-Type": "application/x-www-form-urlencoded",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            credentials: "include",
            body: new URLSearchParams({
              socket_id: socketId,
              channel_name: channel.name,
            }).toString(),
          });
          if (!res.ok) {
            callback(new Error(`Pusher auth failed (${res.status})`), null);
            return;
          }
          const data = await res.json();
          callback(null, data);
        } catch (err) {
          callback(err as Error, null);
        }
      },
    }),
  });

  return client;
}

export function groupChannelName(groupId: number): string {
  return `private-group-${groupId}`;
}
