# Ambassador Portal — Frontend

React 19 + TypeScript SPA built with Vite, TanStack Router & Query, Tailwind CSS.

## Layout

```
frontend/src/
├── api/            # typed axios wrappers (one module per domain)
├── components/
│   ├── ui/         # Button, Card, Dialog (Radix-based primitives)
│   ├── layout/     # Layout + responsive Navbar
│   ├── network/    # NetworkTree + FullNetworkTree (ReactFlow maps)
│   ├── common.tsx  # PageHeader, StatCard, StatusPill, EmptyState, Spinner
│   ├── title.tsx   # TitleBadge, TitleProgress, AchievementGrid
│   ├── icons.tsx   # lucide icon name → component map (DynamicIcon)
│   ├── Leaderboard.tsx
│   ├── LeadDetailModal.tsx     # lead details + comment thread
│   ├── TaskDetailModal.tsx     # task view / submit / review / edit / delete
│   ├── SessionDetailModal.tsx  # session view + role-aware actions
│   └── Celebration.tsx         # title-up modal
├── context/        # AuthContext
├── lib/            # utils (cn), pdf (impact report)
├── pages/          # one file per route
├── routeTree.tsx   # TanStack Router tree (public + authed layout)
└── types.ts        # shared types
```

## Setup

```bash
cd frontend
npm install
copy .env.example .env     # set VITE_API_URL to your backend base URL
npm run dev
```

`.env`:

```
VITE_API_URL=http://localhost:8000
```

> The base URL has **no** `/api` suffix — routers are mounted at the root
> (`/auth`, `/dashboard`, …). The axios client adds the bearer token and
> transparently refreshes on 401.

## Build & deploy

```bash
npm run build      # tsc -b && vite build
```

`vercel.json` includes the SPA rewrite so deep links resolve. On Vercel set
`VITE_API_URL` to the deployed backend URL.

## Design

Light theme with a heliotrope (`#a880ff`) accent, the `Inter`/`Outfit` type pair,
rounded cards and pill buttons. Semantic colour tokens live as CSS variables in
`src/index.css` and are mapped in `tailwind.config.js`. Layout is mobile-first
(hamburger nav, responsive grids, horizontally scrollable tables).

## Conventions

- After editing, run `npx tsc --noEmit` to type-check.
- Data fetching goes through TanStack Query; mutations invalidate the relevant
  query keys (notably `["dashboard"]` after anything that awards points).
