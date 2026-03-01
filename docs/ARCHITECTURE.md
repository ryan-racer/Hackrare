# Codebase architecture

## Tech stack

- **Framework:** Next.js 15 (App Router)
- **Auth:** Auth0 (primary), NextAuth credentials (optional register)
- **DB:** PostgreSQL + Prisma
- **UI:** React 19, Tailwind CSS, TanStack Query, Recharts

## Directory structure

```
src/
├── app/                    # Next.js App Router
│   ├── (auth)/             # Login, register (unauthenticated)
│   ├── (dashboard)/        # Patient & doctor dashboards (protected)
│   ├── api/                # API routes (check-ins, trends, cron, auth, etc.)
│   ├── layout.tsx
│   └── page.tsx            # Landing
├── components/             # Shared React components
├── constants/              # App-wide constants (routes, app name)
├── lib/                    # Shared utilities and services
│   ├── auth.ts             # NextAuth config (credentials)
│   ├── auth0.ts            # Auth0 session + DB user resolution
│   ├── db.ts               # Prisma client
│   ├── journal/            # Check-in flow engine
│   └── llm/                # OpenAI usage (summarize, trends, general chat)
├── types/                  # TypeScript types and declarations
│   ├── journal.ts          # Question flows and journal types
│   └── next-auth.d.ts      # NextAuth module augmentation
└── middleware.ts           # Auth0 middleware
```

## Key flows

- **Auth:** Middleware uses Auth0; `getSessionWithUser()` in `lib/auth0.ts` returns Auth0 session and ensures a matching Prisma `User` (created on first login).
- **Check-ins:** Journal templates define question flows (`types/journal.ts`); `lib/journal/flow-engine.ts` drives the conversation; messages and summaries stored via Prisma.
- **Cron:** `GET /api/cron/run-check-ins` creates new check-ins for assigned journals; protect with `Authorization: Bearer <CRON_SECRET>`.
