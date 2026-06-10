# SpacePoint Ambassador Portal

A platform for scaling global education outreach through a tiered network of
**Ambassadors → Teachers/Instructors**, with gamified **points**, **titles**,
**badges**, and impact tracking.

```
ambassadorsV1/
├── backend/    # FastAPI + async SQLAlchemy + PostgreSQL (Supabase)
└── frontend/   # React 19 SPA — Vite + TypeScript + TanStack Router/Query + Tailwind
```

## Core model

```
Admin       — approves applications, manages leads, configures titles & rewards
  └── Ambassador   — recruits teachers/instructors, submits leads, earns points & titles
        ├── Teacher      — schedules & delivers student sessions
        └── Instructor   — recruited educator
```

## Points & Titles (how rewards work)

- **Points are lifetime and ledger-backed** — every point traces to a record
  (task approved, lead converted, teacher/instructor recruited, session delivered);
  balance = `SUM(amount)`. The only decrease is an explicit **correction** when a
  converted lead is un-converted (a negative `adjust` row), so totals always reflect
  reality.
- Reaching a point threshold unlocks a **Title** (Cadet → Pilot → … → Admiral),
  fully **admin-configurable** (name, threshold, icon, colour).
- **Badges** reward specific milestones and are **admin-configurable** too
  (label, icon, metric + threshold) — separate from titles.
- **Teachers earn points** (on session delivery) for their own recognition; titles
  stay ambassador-only.

> There is no commission system and no points redemption. Points exist purely to
> rank participants and unlock titles/badges.

## Features

- **Mission Control dashboard** — title progress, lifetime + monthly points,
  impact stats, badges, leaderboard (all-time / monthly seasons), points history.
- **Leads** — submit **B2B** (company) or **B2C** (individual) leads, each with a
  **comment thread**; admin converts them (awards points; reversible).
- **Tasks** — assign, accept, **submit work**, review, edit, delete; a detail dialog
  for all of it; approved tasks award points.
- **Network** — invite links (for teachers & instructors), pending **teacher applications**
  (with answers to admin-configurable questions), approve/reject with one click, manage
  sessions, instructors, and an interactive **network map**; admins get a whole-platform
  map + a **global activity feed**.
- **Teacher portal** — impact header, upcoming/past sessions, session materials,
  mark delivered with attendance, and a teacher leaderboard (ranked by students).
- **Titles & badges** — celebratory title-up moment, badge grid; both admin-managed.
- **Public certificate** — a shareable `/a/:id` page, plus a branded PDF impact report.
- **Admin** — approvals, full user management (create/edit/delete), lead pipeline +
  comments, sessions, network + activity, **application form questions** (CRUD with
  required/optional toggle), title & badge editors, reward settings, and a per-ambassador
  performance page with points log.
- **Leaderboard seasons** — monthly window alongside all-time.
- **Notifications** — in-app bell with unread badge.

## Tech stack

- **Backend** — FastAPI, async SQLAlchemy, asyncpg, PostgreSQL (Supabase), JWT auth.
- **Frontend** — React 19, TypeScript, TanStack Router + Query, Tailwind CSS,
  Radix UI primitives, ReactFlow, lucide-react, jsPDF.

## Quick start

1. **Database** — run [`backend/schema.sql`](./backend/schema.sql) against your
   Supabase Postgres instance.
2. **Backend** — see [`backend/README.md`](./backend/README.md).
3. **Frontend** — see [`frontend/README.md`](./frontend/README.md).

## Roles & routes

| Route | Who | Purpose |
|-------|-----|---------|
| `/dashboard` | ambassador | Mission Control |
| `/leads` | ambassador | Lead pipeline + comments |
| `/tasks` | ambassador, teacher | Assigned & created tasks |
| `/network` | ambassador | Sessions, network map, teachers, instructors |
| `/teacher` | teacher | Session scheduling, delivery, materials, impact |
| `/leaderboard` | all | Ambassador board (points) / teacher board (students) |
| `/profile` | all | Profile, title, badges, certificate / ambassador + impact |
| `/admin` | admin | Network, users, tasks, leads, sessions, questions, titles, badges, settings |
| `/admin/ambassador/:id` | admin | Per-ambassador performance + points log |
| `/a/:id` | public | Shareable ambassador certificate |
| `/apply`, `/teacher-apply`, `/teacher-apply/:code`, `/invite/:code` | public | Applications |
