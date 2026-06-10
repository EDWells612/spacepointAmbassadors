# SpacePoint Ambassador Portal — Handoff (v1.3)

## Status
Full rewrite of the ambassador portal. TypeScript clean (`npx tsc --noEmit` passes);
backend syntax verified (`py_compile`). Running against a live Supabase DB — apply
`schema.sql` (or the incremental migrations below) and smoke-test the flows.

## Stack
- **Backend** — FastAPI, async SQLAlchemy (asyncpg), PostgreSQL (Supabase), JWT.
- **Frontend** — React 19 + TypeScript, Vite, TanStack Router + Query, Tailwind,
  Radix UI, ReactFlow, lucide-react, jsPDF.

```
ambassadorsV1/
├── backend/   (app/{core,db,models,schemas,services,routers}, schema.sql, seed.py)
└── frontend/  (src/{api,components,context,lib,pages})
```

## Domain model
```
Admin       → approves users, manages everything, configures titles/badges/rewards/questions
Ambassador  → recruits teachers + instructors, submits leads, runs tasks,
              earns points → titles + badges, views teacher profiles
Teacher     → schedules & delivers sessions (attendance recorded), earns points,
              ranked on a students-reached leaderboard
Instructor  → recruited educator (approved by admin)
```

## Rewards model (read this first)
- **Points are lifetime and ledger-backed.** `points_transactions` rows; balance =
  `SUM(amount)`. Every point traces to a reason (task approved, lead converted,
  teacher/instructor recruited, session delivered). There is **no redemption/swag**
  and **no commission system**.
- **Points can only decrease via an explicit correction** — the one case is
  un-converting a lead, which writes a negative `type='adjust'` reversal row so the
  total always equals `reward × (currently converted leads)`. A lead's
  `points_awarded` flag prevents double-awarding when toggling converted↔closed.
- **Teachers also earn points** (on session delivery) — used for their own
  recognition; titles are per-audience (ambassador ladder vs teacher ladder).
- **Titles** = admin-configurable point thresholds (Cadet → Admiral for ambassadors,
  Explorer → Luminary for teachers). Edit in Admin → Titles.
- **Badges** = admin-configurable milestone definitions (`badge_definitions`),
  unlocked when a metric reaches a threshold. Edit in Admin → Badges.

## Feature surface

### Admin (`/admin`, tabbed)
`Network · Approvals · Users · Tasks · Leads · Sessions · Titles · Badges · Questions · Settings`

- **Network** (default): toggle **Full network** (whole-platform ReactFlow tree) vs
  **By ambassador** (drill-down). Full view shows a **Global activity** feed.
- **Approvals**:
  - **Ambassador applications** — users with `role=ambassador, status=pending`.
  - **Teacher applications (via invite form)** — entries in the `teacher_applications`
    table with `status=pending`. Each row is **clickable** and opens a detail modal
    showing the applicant's answers with actual question text. Approve creates the
    user and awards recruitment points; reject marks the application.
  - **Teacher accounts (direct)** — users with `role=teacher, status=pending`
    (manually created accounts that bypassed the form).
  - **Instructor applications** — pending instructors.
- **Users**: list/filter, create, edit (role/status/country/password), hard delete.
- **Tasks**: assign to ambassadors + review via the task dialog.
- **Leads**: change status (converting awards points) + open the comment thread.
- **Sessions**: table of all sessions; click → manage dialog.
- **Titles / Badges**: full CRUD with icon/colour/threshold editors.
- **Questions**: full CRUD for teacher application form questions.
  - Types: `text`, `number`, `radio`, `multiple_choice`.
  - `radio` and `multiple_choice` show an **options editor** (add/remove individual
    options inline; press Enter or click Add).
  - **Order is drag-free** — up/down chevron buttons on the left of each row swap
    adjacent questions. No manual order field; new questions auto-append to the end.
  - Toggle required/optional. Soft-delete to preserve historical answers.
- **Settings**: reward amounts with an explicit Save button.
- Clicking an ambassador in Users/Network opens **`/admin/ambassador/$id`** — full
  performance page: identity, title progress, stat cards, badges, network map, points log.

### Ambassador
- **Dashboard** — title progress, lifetime + monthly points, impact stats, badges,
  leaderboard, points history.
- **Leads** — submit B2B or B2C leads; each lead has a detail + comment thread.
- **Tasks** — assign to teachers; full task dialog (view/submit/review/edit/delete).
- **Network**:
  - Invite code + shareable links (teacher + instructor).
  - **Sessions** card — scrollable, click → manage dialog.
  - **Teacher Applications** card — pending apps; click the name to open answer modal,
    approve/reject buttons. Answer keys resolve to actual question text.
  - Network map, active teachers (each row is a **clickable link** → teacher profile),
    instructors.
- **Teacher Profile** (`/network/teacher/$teacherId`) — mirrors the admin ambassador
  page. Shows: initials avatar, name, email, status, join date; stat cards (sessions
  done, students reached, total sessions); full sessions list — each row clickable to
  open the session manage dialog. Accessible only for teachers in the ambassador's
  own network.
- **Profile** — title, badges, certificate link, invite code.

### Teacher
- **Teacher Portal** — impact stat header, Upcoming vs Past session split, session
  dialog (view/edit/delete, status timeline, Open material, mark delivered).
- **Leaderboard** — teachers ranked by students reached (points as tiebreaker).
- **Profile** — sessions/students stat cards + Ambassador card.

### Teacher application form (`/teacher-apply` or `/teacher-apply/:code`)
- **2-step form**:
  - **Step 1** — Full name, Email, Password (all required), Invite code. "Next"
    validates these fields before advancing. If no questions exist, "Submit" appears
    directly on step 1.
  - **Step 2** — Dynamic questions configured by admin. "Back" returns to step 1
    without losing data.
- Step indicator (● 1 — ● 2) shown only when questions exist.
- Supports all four question types: `text` (text input), `number` (number input),
  `radio` (radio buttons from options), `multiple_choice` (checkboxes from options).
- Answers stored as `{ question_id: value }` where multi-select values are arrays.

### Tasks lifecycle
`pending → accepted → submitted → approved (+points) / edit_requested / rejected`

### Sessions lifecycle
`pending → approved → material sent → done (attendance)`
Teacher owns create/edit/delete; ambassador/admin approve, reject, send material.
Delivery awards points to both teacher and their ambassador.

### Other
- **Title-up celebration** (`components/Celebration.tsx`) on threshold crossing.
- **Public certificate** — unauth `/a/:id` + `GET /public/ambassador/{id}`.
- **Impact PDF** (`lib/pdf.ts`) — logo, title chip, metric cards, badges.
- Brand logo is `frontend/src/assets/logo.svg`.

## Key backend files
- `app/main.py` — registers all routers.
- `core/security.py` (JWT/bcrypt), `core/dependencies.py`
  (`get_current_active_user`, `require_admin/ambassador/teacher`).
- `db/session.py` — async engine; permissive SSL + `statement_cache_size=0`.
- Services: `points.py`, `titles.py`, `achievements.py`, `stats.py`,
  `notifications.py`, `auth.py`.
- Routers: `auth, users, leads, tasks, network, dashboard, admin, titles, badges,
  teacher, points, achievements, public, materials`.
  - **network** extras: `GET /network/teachers/{id}` (single teacher profile),
    `GET /network/teachers/{id}/sessions`, teacher-applications CRUD.
  - **admin** extras: users CRUD, `/admin/network`, `/admin/activity`,
    `/admin/ambassadors/{id}/network`, `/admin/users/{id}/points-log`,
    `/admin/teacher-sessions`, application-questions CRUD (auto-order on create),
    teacher-applications list/approve/reject.
  - **public**: `GET /public/teacher-application-questions` (active questions only).

## Key frontend files
- `routeTree.tsx` — all routes including `/admin/ambassador/$ambassadorId` and
  `/network/teacher/$teacherId`.
- `context/AuthContext.tsx`, `api/client.ts` (token + refresh interceptor).
- `pages/` — `Login, Apply, TeacherApply, InstructorApply, Home, Dashboard, Leads,
  Tasks, Network, TeacherProfile, TeacherPortal, Leaderboard, Profile, Admin,
  AdminAmbassador, PublicProfile`.
- `components/` — `ui/`, `layout/`, `common.tsx`, `title.tsx`, `icons.tsx`,
  `Leaderboard.tsx`, `Celebration.tsx`, `LeadDetailModal.tsx`, `TaskDetailModal.tsx`,
  `SessionDetailModal.tsx`, `network/{NetworkTree,FullNetworkTree}.tsx`.
- `api/` — `admin.ts, application.ts, auth.ts, badges.ts, dashboard.ts, leads.ts,
  materials.ts, network.ts, notifications.ts, tasks.ts, teacher.ts, titles.ts`.

## Env vars
- Backend `.env`: `DATABASE_URL` (**`postgresql+asyncpg://…`**, pooler port `5432`),
  `SECRET_KEY`.
- Frontend `.env`: `VITE_API_URL` (backend base URL, no `/api` suffix).

## Database
Apply `backend/schema.sql` once (idempotent; uncomment drop block for clean rebuild).

Tables:
```
users, leads, lead_comments, tasks, teacher_sessions, instructors,
application_questions, teacher_applications, points_transactions,
titles, achievements, badge_definitions, materials, notifications,
system_settings
```
+ the `user_role` enum.

Seeds: reward settings, ambassador + teacher title ladders, ambassador + teacher badges.

Seed demo data: `python seed.py` (or `python seed.py --reset`).

### Incremental migrations (upgrading an existing DB)

```sql
-- ── Prior to v1.1 ────────────────────────────────────────────────────────────
ALTER TABLE teacher_sessions ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE teacher_sessions ADD COLUMN IF NOT EXISTS material_link TEXT;
ALTER TABLE tasks            ADD COLUMN IF NOT EXISTS submission TEXT;
ALTER TABLE leads            ADD COLUMN IF NOT EXISTS points_awarded BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE leads SET points_awarded = TRUE WHERE status = 'converted';
ALTER TABLE leads ALTER COLUMN company DROP NOT NULL;

-- ── v1.1 (points-integrity + teacher recognition + materials) ─────────────────
ALTER TABLE tasks            ADD COLUMN IF NOT EXISTS points_awarded BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE tasks SET points_awarded = TRUE WHERE status = 'approved';
ALTER TABLE users            ADD COLUMN IF NOT EXISTS recruit_points_awarded BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE users SET recruit_points_awarded = TRUE
  WHERE role = 'teacher' AND status = 'active' AND invited_by_id IS NOT NULL;
ALTER TABLE instructors      ADD COLUMN IF NOT EXISTS recruit_points_awarded BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE instructors SET recruit_points_awarded = TRUE WHERE status = 'active';
ALTER TABLE teacher_sessions ADD COLUMN IF NOT EXISTS status_note TEXT;
ALTER TABLE teacher_sessions ADD COLUMN IF NOT EXISTS points_awarded BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE teacher_sessions SET points_awarded = TRUE WHERE status = 'done';
ALTER TABLE titles            ADD COLUMN IF NOT EXISTS audience VARCHAR(20) NOT NULL DEFAULT 'ambassador';
ALTER TABLE badge_definitions ADD COLUMN IF NOT EXISTS audience VARCHAR(20) NOT NULL DEFAULT 'ambassador';

-- ── v1.2 (teacher application questions + applications table) ─────────────────
CREATE TABLE IF NOT EXISTS application_questions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_text VARCHAR(500) NOT NULL,
  question_type VARCHAR(50)  NOT NULL,
  required      BOOLEAN NOT NULL DEFAULT TRUE,
  "order"       INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS teacher_applications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name     VARCHAR(255) NOT NULL,
  email         VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  invite_code   VARCHAR(100) NOT NULL,
  invited_by_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  answers       JSONB DEFAULT '{}',
  status        VARCHAR(50)  NOT NULL DEFAULT 'pending',
  created_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_teacher_applications_status     ON teacher_applications(status);
CREATE INDEX IF NOT EXISTS idx_teacher_applications_invited_by ON teacher_applications(invited_by_id);
CREATE INDEX IF NOT EXISTS idx_application_questions_deleted   ON application_questions(deleted_at);

-- ── v1.3 (question options, 2-step apply form, teacher profile page) ──────────
-- Add options column for radio/multiple_choice question types:
ALTER TABLE application_questions ADD COLUMN IF NOT EXISTS options TEXT[];
```

## Smoke-test path
1. Apply schema; create an admin (or `python seed.py`).
2. `/apply` as ambassador → Admin → Approvals → approve → sign in.
3. Admin → Questions: create a few questions with mixed types. Try reordering with
   the up/down buttons. Verify new questions append to the end automatically.
4. For `radio` or `multiple_choice` questions, add options using the inline options
   editor (type + Enter or click Add).
5. Open `/teacher-apply/:code` in a new tab. Verify step 1 validates required fields
   before advancing. Complete step 2 with all question types.
6. Ambassador → Network → Teacher Applications → click the applicant name to view
   answers (question text shown, not IDs) → approve.
7. Admin → Approvals → "Teacher applications (via invite form)" section — same
   application appears here; click name to open modal with answers → can approve/reject.
8. Teacher signs in, creates a session → ambassador Network → session dialog →
   approve → material sent → teacher marks done with attendance → points awarded.
9. Ambassador → Network → Active Teachers → click a teacher row → opens
   `/network/teacher/$id` profile page with stats + sessions list.
10. Cross a points threshold → title-up celebration on dashboard.
11. Check leaderboard, profile certificate, public `/a/<id>`, impact PDF.
12. Admin: Users CRUD, Network tree, Questions reorder, Titles/Badges editors,
    Settings save, click ambassador → `/admin/ambassador/$id` points log.

## Gotchas
- `tsconfig.app.json` sets `"ignoreDeprecations": "6.0"` and `verbatimModuleSyntax`
  (use `import type { … }`).
- `vercel.json` SPA rewrite required for deep links.
- `DATABASE_URL` must use the `+asyncpg` driver; pooler port `5432` (session mode) is
  the proven setup.
- **Run the v1.3 migration** (`ADD COLUMN options TEXT[]`) before starting the backend
  — a missing column causes the ORM's SELECT to fail and the whole view returns empty.
- Invalidate `["dashboard"]` (and relevant query keys) after mutations that award points.
- Title/badge icons are looked up by name in `components/icons.tsx`; unknown names
  fall back to a default.
- Application question answers are keyed by question UUID. The frontend resolves these
  to question text by fetching `/public/teacher-application-questions` — deleted
  questions won't resolve (shows "Unknown question").

## Roadmap (not started)
- Real-time notifications (WebSocket / Supabase Realtime).
- Email invitations for teachers/instructors.
- Configurable season length (currently calendar month).
- Alembic migrations (schema is applied as raw SQL today).
- Tighten CORS to the deployed frontend origin (currently `*`).
- Link `teacher_applications.user_id` → `users.id` after approval (currently matched
  by email; makes "show application answers on teacher profile" trivial).
