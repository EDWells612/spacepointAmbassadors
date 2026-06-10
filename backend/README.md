# Ambassador Portal — Backend

FastAPI + async SQLAlchemy (asyncpg) + PostgreSQL (Supabase).

## Layout

```
backend/
├── app/
│   ├── main.py              # app + router registration
│   ├── core/                # config, security (JWT/bcrypt), dependencies
│   ├── db/                  # async engine + session
│   ├── models/              # SQLAlchemy ORM models
│   ├── schemas/             # Pydantic request/response models
│   ├── services/            # auth, points, titles, achievements, stats, notifications
│   └── routers/             # auth, users, leads, tasks, network, dashboard, admin,
│                            #   titles, badges, teacher, points, achievements, public
├── schema.sql               # full Postgres schema + seed data
├── seed.py                  # demo data (python seed.py [--reset])
└── requirements.txt
```

## Setup

```bash
cd backend
python -m venv venv
venv\Scripts\activate         # Windows  (source venv/bin/activate on macOS/Linux)
pip install -r requirements.txt
copy .env.example .env        # then edit values
```

`.env`:

```
DATABASE_URL=postgresql+asyncpg://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres
SECRET_KEY=<long-random-string>
```

> Note the **`+asyncpg`** driver in the URL. The engine sets a permissive SSL
> context for the Supabase pooler.

## Run

```bash
uvicorn app.main:app --reload --port 8000
```

OpenAPI docs at `http://localhost:8000/docs`.

For deployment, set the start command to:

```
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

## Database

Apply `schema.sql` once against Supabase (it is idempotent; a drop block is
included but commented out). Tables created:

```
users, leads, lead_comments, tasks, teacher_sessions, instructors,
application_questions, teacher_applications, points_transactions,
titles, achievements, badge_definitions, materials, notifications,
system_settings
```

Seeds reward settings, the default ambassador + teacher title ladders, and default badges.

If upgrading an already-applied schema, see the incremental `ALTER`s in `../HANDOFF.md`.

Create the first admin by registering normally and then running
`UPDATE users SET role='admin', status='active' WHERE email='you@…';`

## Auth

- `POST /auth/login` → `{ access_token, refresh_token }` (JSON body `{email, password}`).
- `POST /auth/refresh` → new token pair.
- Bearer token carries `sub` (user id) and `role`.
- Public application endpoints:
  - `/auth/apply` — ambassador application.
  - `/auth/teacher-apply` — teacher application (stores in `teacher_applications`).
  - `/auth/instructor-apply` — instructor application.
  - `/auth/invite/{code}` — validate invite code.

## Teacher Applications

Teachers apply via `/auth/teacher-apply` (public). Body: `full_name`, `email`,
`password`, `invite_code`, and optional `answers` (`{ question_id: value }`).
A `TeacherApplication` row is created with `status='pending'`.

**Ambassador review** (`/network/teacher-applications`):
- `GET /network/teacher-applications` — pending apps for the current ambassador.
- `PUT /network/teacher-applications/{id}/approve` — creates User + awards points.
- `PUT /network/teacher-applications/{id}/reject`.

**Admin review** (`/admin/teacher-applications`):
- `GET /admin/teacher-applications?status=pending` — all applications, filterable.
- Same approve/reject endpoints under `/admin/`.

## Application Questions

Admin manages the teacher application form questions:

- `GET  /admin/application-questions` — all questions including soft-deleted.
- `POST /admin/application-questions` — create; `order` is auto-assigned (max+1).
- `PUT  /admin/application-questions/{id}` — update text, type, required, order, options.
- `DELETE /admin/application-questions/{id}` — soft-delete (preserves historical answers).

Supported `question_type` values: `text`, `number`, `radio`, `multiple_choice`.
`radio` and `multiple_choice` require an `options: string[]` payload.

Public (unauthenticated):
- `GET /public/teacher-application-questions` — active questions only, ordered by `order`.

## Network — Teacher Profile

Ambassadors can fetch a single teacher in their network:
- `GET /network/teachers/{teacher_id}` — returns `TeacherOut` (404 if not in your network).
- `GET /network/teachers/{teacher_id}/sessions` — all sessions for that teacher.

## Points model

Points live in `points_transactions`; balance is `SUM(amount)`. Earnings are
`type='earn'`; the only decrease is a `type='adjust'` correction. There is no
redemption path. `services/points.py` exposes `award_points` / `adjust_points` /
`lifetime_points`; `services/titles.py` maps a balance to the current/next title;
`services/achievements.py` grants badges from the admin-managed `badge_definitions`
table. Teachers also accrue points (session delivery) but titles are per-audience.

## Conventions

- After editing, run `python -m py_compile app/**/*.py` to catch syntax errors.
- Services accept the request's `AsyncSession` and queue work; the router commits.
