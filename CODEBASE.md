# Klave — Codebase Walkthrough
 
A quick orientation for a new developer joining the project. 

Klave is a chat-first platform for real estate course sellers — think "WhatsApp meets Udemy." Creators sell access to chat-based courses; students join groups and consume lessons through messages.

--- 

## 1. The Stack

| Layer | Tech |
| --- | --- |
| Monorepo | pnpm workspaces |
| Frontend | React 18 + Vite + TypeScript |
| Routing | Wouter (lightweight alternative to React Router) |
| Data fetching | TanStack Query v5 (auto-generated hooks) |
| UI | Tailwind CSS + shadcn/ui (Radix primitives) |
| Theme | next-themes (light/dark) |
| Charts | Recharts |
| Auth | Clerk |
| Backend | Express + TypeScript |
| Database | Postgres (Neon, eu-west-2) |
| ORM | Drizzle |
| API contract | OpenAPI 3 (single source of truth) |
| Codegen | Orval (generates typed React Query hooks from OpenAPI) |
| Frontend host | Vercel |
| Backend host | Render (`klave-api.onrender.com`) |

The defining architectural choice: **the frontend never writes a `fetch()` call by hand.** The OpenAPI spec is compiled into typed React hooks like `useGetGroup()`, `useSendMessage()`, etc. Change the spec, regenerate, and TypeScript tells you everywhere the contract drifted.

---

## 2. Repository Layout

```
.
├── artifacts/
│   ├── klave/           ← The web app (React + Vite)
│   ├── api-server/      ← The Express API
│   └── mockup-sandbox/  ← Internal tool for prototyping UI on canvas
└── lib/
    ├── api-spec/        ← OpenAPI YAML — the contract
    ├── api-client-react/← Generated React Query hooks (don't edit by hand)
    ├── api-zod/         ← Generated Zod validators
    └── db/              ← Drizzle schema + DB client
```

Two things to understand:

1. Anything in `artifacts/` is a deployable unit.
2. Anything in `lib/` is a shared package consumed by the artifacts via workspace imports (`@workspace/db`, `@workspace/api-client-react`, etc.).

---

## 3. The Database (`lib/db/src/schema/`)

Each file is one table. The important ones:

- **`users.ts`** — User profile. Linked to Clerk by `clerkUserId`. Has `role` (`student` or `creator`), `walletBalance`, `bio`, etc.
- **`groups.ts`** — A "course group" (chat room). Has `creatorId`, `subject`, `price`, `subscriptionModel`, `coverImageUrl`.
- **`groupMembers.ts`** — Join table. Who's in which group.
- **`messages.ts`** — Chat messages within a group. Has `senderId`, `groupId`, `content`, optional `lectureFlag`.
- **`payments.ts`** — Payment records (subscriptions, one-off purchases).
- **`transactions.ts`** — Wallet ledger entries. Every credit/debit lives here for audit.
- **`replicationJobs.ts`** — Async jobs for the AI "replicate this lecture to N other groups" feature.

`lib/db/src/index.ts` exports a configured Drizzle client that reads `DATABASE_URL` from env. Both the API server and any scripts use the same client.

To sync schema changes to the database: `pnpm --filter @workspace/db run db:push` (or sometimes from the api-server filter — check `package.json` scripts).

---

## 4. The API Server (`artifacts/api-server/`)

Standard Express app. Entry point is `src/index.ts`, which loads `src/app.ts` (the Express instance with middleware wired up).

### Middleware (`src/middlewares/`)

- **`clerkProxyMiddleware.ts`** — Verifies the Clerk session on incoming requests, attaches the authenticated user to `req`. Every protected route goes through this.

### Routes (`src/routes/`)

One file per resource, all mounted in `src/routes/index.ts`:

| File | What it does |
| --- | --- |
| `users.ts` | `/api/users/me`, profile read/update, role switching |
| `groups.ts` | List, create, join, leave, get details |
| `messages.ts` | List messages in a group, send, delete |
| `wallet.ts` | Balance, transactions, top-up |
| `payments.ts` | Stripe-ish endpoints (currently stubbed for v1) |
| `dashboard.ts` | Creator analytics (revenue chart on /grow) |
| `ai.ts` | The "replicate this lecture to other groups" AI endpoint |
| `health.ts` | `/health` for Render's uptime checks |

Each handler validates input with Zod (often using the auto-generated validators from `lib/api-zod`), queries the DB through Drizzle, and returns JSON.

---

## 5. The Frontend (`artifacts/klave/src/`)

### Entry & shell

- `main.tsx` — Mounts React, wraps everything in Clerk's provider, TanStack Query provider, and the theme provider.
- `App.tsx` — Wouter routes. Public routes (landing, sign-in) and authenticated routes (chats, groups, wallet, etc.) are split here.

### Pages (`src/pages/`)

These are the screens. Each one corresponds to a route.

| Page | Route | Purpose |
| --- | --- | --- |
| `landing.tsx` | `/` (signed out) | Marketing page with hero, features, FAQ |
| `chats.tsx` | `/chats` | Inbox-style list of joined groups + suggestions |
| `chat-view.tsx` | `/chats/:id` | The actual chat screen — bubbles, composer, reactions |
| `groups.tsx` | `/groups` | Discover page — browse all available courses |
| `group-detail.tsx`| `/groups/:id` | Course landing page with join/buy CTA |
| `create-group.tsx`| `/groups/new` | Form for creators to publish a new course |
| `wallet.tsx` | `/wallet` | Balance, transactions, top-up |
| `grow.tsx` | `/grow` | Creator analytics — revenue chart, member counts |
| `profile.tsx` | `/profile` | User profile with auto-saving editor |

### Components

- `components/layout/main-layout.tsx` — The 5-tab bottom navigation shell wrapping the authenticated pages (Chats, Discover, Wallet, Grow, Profile).
- `components/onboarding-dialog.tsx` — 3-step welcome modal for new users.
- `components/theme-provider.tsx` + `theme-toggle.tsx` — Dark mode plumbing.
- `components/ui/` — shadcn/ui primitives (Button, Card, Dialog, etc.). Treat as vendored — edit only if you understand the upstream pattern.

### Data fetching

You will not see `fetch()` calls. Instead:

```tsx
import { useGetGroup, useSendMessage } from "@workspace/api-client-react";

const { data: group, isLoading } = useGetGroup(groupId);
const sendMessage = useSendMessage();

sendMessage.mutate({ data: { groupId, content: "hello" } });
```

These hooks come from `lib/api-client-react`, which is **regenerated** from `lib/api-spec/openapi.yaml`. Workflow when adding an endpoint:

1. Edit `lib/api-spec/openapi.yaml` to declare the new endpoint.
2. Run the codegen script (something like `pnpm --filter @workspace/api-spec run codegen`).
3. Implement the endpoint in `artifacts/api-server/src/routes/`.
4. Use the new auto-generated hook in the frontend.

---

## 6. Brand & Design Conventions

- **Primary gradient:** `#5A1DE6 → #3A0CA3` (purple).
- **Accent:** `#F59E0B` (orange) — used sparingly for highlights, dots, badges.
- **Mobile-first:** Everything designed for phone widths first; desktop is a stretched version.
- **Glass UI:** Backdrop blur, soft borders (`border-border/60`), subtle gradient orbs in the background.
- **No emojis in product UI.** Use Lucide icons instead.
- **Rounded corners are big** (`rounded-2xl`, `rounded-3xl`) — softer feel.

---

## 7. Auth Flow (Clerk)

1. User hits the app, Clerk's provider checks for a session.
2. If signed in, the React app sends Clerk's session token with every API request (handled by an Axios/fetch interceptor in the generated client).
3. The API's `clerkProxyMiddleware` validates the token and looks up the matching row in the `users` table (by `clerkUserId`). If no row exists, it creates one (lazy provisioning).
4. `req.user` is now available in every handler.

You'll need your own Clerk dev keys (free at clerk.com) — both a publishable key (frontend) and a secret key (backend).

---

## 8. Local Development

### Prereqs
- Node 20+
- pnpm: `npm install -g pnpm`
- A Postgres database (use Neon's free tier — neon.tech)
- A Clerk dev project (clerk.com)

### Setup
```bash
pnpm install        # Run from the repo root, never inside an artifact
```

### Environment files

`artifacts/api-server/.env`:
```
DATABASE_URL=postgresql://user:pass@host/db?sslmode=require
SESSION_SECRET=any-long-random-string
CLERK_SECRET_KEY=sk_test_...
PORT=3001
```

`artifacts/klave/.env`:
```
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...
VITE_API_URL=http://localhost:3001
```

### First-time DB setup
```bash
pnpm --filter @workspace/db run db:push
```

### Run both services
```bash
# Terminal 1
pnpm --filter @workspace/api-server run dev

# Terminal 2
pnpm --filter @workspace/klave run dev
```

Frontend: http://localhost:5173
API: http://localhost:3001

---

## 9. Deployment

- **Frontend → Vercel.** Auto-deploys on push to `main`. Build command: `pnpm --filter @workspace/klave run build`. Output: `artifacts/klave/dist`.
- **API → Render.** Auto-deploys on push. Build command: `pnpm install && pnpm --filter @workspace/api-server run build`. Start: `pnpm --filter @workspace/api-server run start`.
- **Database → Neon.** No deploy step — schema is pushed manually with `db:push`.

---

## 10. Where to Start Reading

If you have 15 minutes, read these files in this order:

1. `lib/api-spec/openapi.yaml` — see the entire API surface in one place.
2. `lib/db/src/schema/groups.ts` and `messages.ts` — understand the core domain model.
3. `artifacts/api-server/src/routes/messages.ts` — see how a route handler looks.
4. `artifacts/klave/src/pages/chat-view.tsx` — see how the frontend consumes the generated hooks.
5. `artifacts/klave/src/components/layout/main-layout.tsx` — understand the navigation shell.

That covers ~80% of how the app works. Everything else is variations on the same patterns.

---

## 11. Known Gaps / TODO

- Stripe payment flow is stubbed — wallet top-ups don't yet hit a real processor.
- No push notifications (planned: OneSignal).
- No transactional email (planned: Resend).
- No object storage for user-uploaded images (covers currently use presets + inline SVG gradients).
- Chat reactions are local-state only — not persisted to the DB yet.
- Message search is not implemented.
