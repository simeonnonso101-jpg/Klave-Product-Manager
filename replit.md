# Klave

## Overview

Klave is a chat-first platform enabling creators to teach, sell, and monetize knowledge through paid chat groups. It's WhatsApp meets Udemy — built for coaches, tutors, and course creators who want to sell access to chat groups.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui + Framer Motion
- **Routing**: Wouter

## Architecture

- `artifacts/api-server` — Express 5 API backend
- `artifacts/klave` — React/Vite frontend (dark, fintech-inspired UI)
- `lib/api-spec/openapi.yaml` — OpenAPI spec (source of truth)
- `lib/api-client-react` — Generated React Query hooks
- `lib/api-zod` — Generated Zod schemas (server validation)
- `lib/db` — Drizzle ORM + PostgreSQL schema

## Database Schema

- `users` — Creators and students with wallet balance
- `groups` — Paid class groups with pricing/subscription model
- `group_members` — Group membership
- `messages` — Chat messages (text, lecture, system, media)
- `payments` — Payment records for joining groups
- `transactions` — Wallet credit/debit/withdrawal records
- `replication_jobs` — AI lecture replication job tracking

## Key Features (MVP)

1. **Chat System** — Real-time group + personal messaging, polls every 3s
2. **Paid Group Access** — Creator sets price, students pay to join (auto-access granted)
3. **AI Lecture Replication** — Record once, replicate to 100+ groups
4. **Wallet** — Earnings tracking, per-group revenue, withdrawal
5. **Creator Dashboard (Grow)** — Stats, recent subscribers, AI replication jobs

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Orval Config Note

The `lib/api-spec/orval.config.ts` is configured with `mode: "single"` for the Zod output to avoid duplicate export conflicts. The `lib/api-zod/src/index.ts` should only export from `./generated/api` (not `./generated/types`).

## API Routes

- `GET /api/users/me` — Current user (userId=1 for demo)
- `GET /api/groups` — List groups (with creatorId/type filters)
- `POST /api/groups` — Create group
- `GET /api/groups/:id` — Get group
- `PATCH /api/groups/:id` — Update group
- `GET /api/groups/:id/members` — List members
- `POST /api/groups/:id/members` — Add member
- `GET /api/groups/:id/stats` — Group stats
- `GET /api/messages?groupId=X` — List messages
- `POST /api/messages` — Send message
- `DELETE /api/messages/:id` — Delete message
- `GET /api/payments` — List payments
- `POST /api/payments` — Create payment (auto-grants group access)
- `GET /api/wallet/summary?creatorId=X` — Wallet summary
- `GET /api/wallet/transactions?userId=X` — Transaction history
- `POST /api/wallet/withdraw` — Withdraw funds
- `POST /api/ai/replicate` — Replicate lecture to multiple groups
- `GET /api/ai/jobs?creatorId=X` — List replication jobs
- `GET /api/dashboard/creator/:creatorId` — Creator dashboard

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
