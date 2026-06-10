-- ============================================================================
-- SpacePoint Ambassador Portal — clean PostgreSQL schema (Supabase)
-- ============================================================================
-- Run this whole file once against a fresh database. It is idempotent.
--
-- To wipe and rebuild from scratch, uncomment the drop block below first.
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS achievements, badge_definitions, notifications, points_transactions,
  teacher_sessions, instructors, tasks, lead_comments, leads, titles, materials,
  teacher_applications, application_questions, system_settings, users CASCADE;
DROP TYPE IF EXISTS user_role;
-- ----------------------------------------------------------------------------

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Roles enum (referenced by the ORM with create_type=False) -------------------
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
        CREATE TYPE user_role AS ENUM ('admin', 'ambassador', 'teacher');
    END IF;
END$$;

-- Users -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name       VARCHAR(255) NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    role            user_role NOT NULL,
    country         VARCHAR(100),
    invite_code     VARCHAR(100) UNIQUE,
    status          VARCHAR(50)  NOT NULL DEFAULT 'pending',  -- pending, active, rejected
    invited_by_id   UUID REFERENCES users(id) ON DELETE SET NULL,
    -- recruitment points were paid to the inviting ambassador (paid exactly once)
    recruit_points_awarded BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_invited_by ON users(invited_by_id);

-- Leads -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leads (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ambassador_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contact_name  VARCHAR(255) NOT NULL,
    company       VARCHAR(255),                              -- B2B only; null for B2C individuals
    type          VARCHAR(50)  NOT NULL,                      -- B2B, distributor
    status        VARCHAR(50)  NOT NULL DEFAULT 'submitted',  -- submitted, in review, converted, closed
    notes         TEXT,
    points_awarded BOOLEAN NOT NULL DEFAULT FALSE,            -- conversion points awarded once
    created_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_leads_ambassador ON leads(ambassador_id);

-- Lead comments (ambassador ↔ admin thread on a lead) -------------------------
CREATE TABLE IF NOT EXISTS lead_comments (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id    UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
    author_id  UUID REFERENCES users(id) ON DELETE SET NULL,
    body       TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lead_comments_lead ON lead_comments(lead_id);

-- Tasks -----------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tasks (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assigned_to   UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_by    UUID REFERENCES users(id) ON DELETE SET NULL,
    title         VARCHAR(255) NOT NULL,
    description   TEXT,
    deadline      TIMESTAMPTZ,
    status        VARCHAR(50)  NOT NULL DEFAULT 'pending',    -- pending, accepted, submitted, approved, rejected, edit_requested
    points_reward INTEGER NOT NULL DEFAULT 0,
    edit_notes    TEXT,
    submission    TEXT,                                      -- ambassador's submitted work (link / notes)
    points_awarded BOOLEAN NOT NULL DEFAULT FALSE,           -- reward currently held (reversed on revoke)
    created_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);

-- Teacher sessions ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS teacher_sessions (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title             VARCHAR(255) NOT NULL,
    description       TEXT,
    date              TIMESTAMPTZ NOT NULL,
    status            VARCHAR(50)  NOT NULL DEFAULT 'pending',  -- pending, approved, done, rejected, cancelled
    status_note       TEXT,                                     -- reason given on cancel / reject
    material_sent     BOOLEAN NOT NULL DEFAULT FALSE,
    material_link     TEXT,
    planned_students  INTEGER NOT NULL DEFAULT 0,
    attended_students INTEGER NOT NULL DEFAULT 0,
    points_awarded    BOOLEAN NOT NULL DEFAULT FALSE,           -- delivery points currently held
    created_at        TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sessions_teacher ON teacher_sessions(teacher_id);

-- Instructors -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS instructors (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invited_by  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    email       VARCHAR(255) NOT NULL,
    status      VARCHAR(50)  NOT NULL DEFAULT 'pending',       -- pending, active, rejected
    recruit_points_awarded BOOLEAN NOT NULL DEFAULT FALSE,     -- recruitment points paid once
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- Points ledger (lifetime — only ever accrues, never decreases) ---------------
CREATE TABLE IF NOT EXISTS points_transactions (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ambassador_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount        INTEGER NOT NULL,
    type          VARCHAR(50) NOT NULL DEFAULT 'earn',         -- always 'earn'
    reason        TEXT NOT NULL,
    created_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_points_ambassador ON points_transactions(ambassador_id);

-- Titles (admin-configurable ranks unlocked by lifetime points) ---------------
CREATE TABLE IF NOT EXISTS titles (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(100) NOT NULL,
    min_points  INTEGER NOT NULL DEFAULT 0,
    icon        VARCHAR(50),
    color       VARCHAR(20),
    sort_order  INTEGER NOT NULL DEFAULT 0,
    audience    VARCHAR(20) NOT NULL DEFAULT 'ambassador',     -- ambassador | teacher
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- Achievements (earned milestone badges, distinct from titles) ----------------
CREATE TABLE IF NOT EXISTS achievements (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ambassador_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code          VARCHAR(50) NOT NULL,
    created_at    TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT uq_achievement_per_user UNIQUE (ambassador_id, code)
);

-- Badge definitions (admin-configurable milestone badges) ---------------------
CREATE TABLE IF NOT EXISTS badge_definitions (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code          VARCHAR(50) UNIQUE NOT NULL,
    label         VARCHAR(100) NOT NULL,
    description   VARCHAR(255),
    icon          VARCHAR(50),
    criteria_type VARCHAR(50) NOT NULL,   -- converted_leads, active_teachers, sessions_done, students_reached, lifetime_points
    threshold     INTEGER NOT NULL DEFAULT 1,
    sort_order    INTEGER NOT NULL DEFAULT 0,
    audience      VARCHAR(20) NOT NULL DEFAULT 'ambassador',  -- ambassador | teacher
    created_at    TIMESTAMPTZ DEFAULT now()
);

-- Materials library (shared teaching resources) -------------------------------
CREATE TABLE IF NOT EXISTS materials (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_by  UUID REFERENCES users(id) ON DELETE SET NULL,
    title       VARCHAR(255) NOT NULL,
    description TEXT,
    link        TEXT NOT NULL,
    category    VARCHAR(100),
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- Notifications ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
    id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title      VARCHAR(255) NOT NULL,
    body       TEXT,
    type       VARCHAR(50),                                   -- task, points, lead, session, system, title
    is_read    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);

-- Application questions (admin-configurable teacher application form) ---------
CREATE TABLE IF NOT EXISTS application_questions (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_text VARCHAR(500) NOT NULL,
    question_type VARCHAR(50)  NOT NULL,                        -- text, number, radio, multiple_choice
    required      BOOLEAN NOT NULL DEFAULT TRUE,
    "order"       INTEGER NOT NULL DEFAULT 0,
    options       TEXT[],                                        -- choices for radio / multiple_choice
    created_at    TIMESTAMPTZ DEFAULT now(),
    deleted_at    TIMESTAMPTZ                                    -- soft-delete; NULL = active
);
CREATE INDEX IF NOT EXISTS idx_application_questions_deleted ON application_questions(deleted_at);

-- Teacher applications (pending teacher sign-ups via the invite form) ---------
CREATE TABLE IF NOT EXISTS teacher_applications (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name     VARCHAR(255) NOT NULL,
    email         VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    invite_code   VARCHAR(100) NOT NULL,
    invited_by_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    answers       JSONB DEFAULT '{}',                           -- { question_id: answer_value }
    status        VARCHAR(50)  NOT NULL DEFAULT 'pending',      -- pending, approved, rejected
    created_at    TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_teacher_applications_status     ON teacher_applications(status);
CREATE INDEX IF NOT EXISTS idx_teacher_applications_invited_by ON teacher_applications(invited_by_id);

-- System settings (points reward amounts, etc.) ------------------------------
CREATE TABLE IF NOT EXISTS system_settings (
    key   VARCHAR(255) PRIMARY KEY,
    value VARCHAR(255) NOT NULL
);

-- ── Seed data ───────────────────────────────────────────────────────────────

-- Reward amounts
INSERT INTO system_settings (key, value) VALUES
    ('lead_points_reward', '1000'),
    ('teacher_points_reward', '500'),
    ('instructor_points_reward', '500'),
    ('session_points_reward', '200')
ON CONFLICT (key) DO NOTHING;

-- Default title ladder (edit freely in the Admin → Titles panel)
INSERT INTO titles (name, min_points, icon, color, sort_order) VALUES
    ('Cadet',      0,     'Rocket',  '#9ca3af', 1),
    ('Pilot',      1000,  'Star',    '#60a5fa', 2),
    ('Navigator',  3000,  'Satellite', '#a880ff', 3),
    ('Commander',  7000,  'Shield',  '#643f83', 4),
    ('Captain',    15000, 'Medal',   '#f5b942', 5),
    ('Admiral',    30000, 'Crown',   '#facc15', 6)
ON CONFLICT DO NOTHING;

-- Default milestone badges (edit freely in Admin → Badges)
INSERT INTO badge_definitions (code, label, description, icon, criteria_type, threshold, sort_order) VALUES
    ('first_lead',       'First Contact',   'Converted your first lead',              'Handshake',      'converted_leads',  1,   1),
    ('ten_leads',        'Dealmaker',       'Converted 10 leads',                     'Briefcase',      'converted_leads',  10,  2),
    ('first_teacher',    'Mentor',          'Recruited your first teacher',           'GraduationCap',  'active_teachers',  1,   3),
    ('five_teachers',    'Network Builder', 'Recruited 5 active teachers',            'Users',          'active_teachers',  5,   4),
    ('first_session',    'Liftoff',         'Your network delivered its first session','Rocket',        'sessions_done',    1,   5),
    ('ten_sessions',     'Mission Control', '10 sessions delivered by your network',  'Radio',          'sessions_done',    10,  6),
    ('hundred_students', 'Star Reach',      'Reached 100 students',                   'Star',           'students_reached', 100, 7)
ON CONFLICT (code) DO NOTHING;

-- Default teacher title ladder (teachers earn points on session delivery)
INSERT INTO titles (name, min_points, icon, color, sort_order, audience) VALUES
    ('Explorer',   0,    'Rocket', '#9ca3af', 1, 'teacher'),
    ('Educator',   600,  'Star',   '#60a5fa', 2, 'teacher'),
    ('Inspirer',   2000, 'Flame',  '#a880ff', 3, 'teacher'),
    ('Luminary',   5000, 'Crown',  '#facc15', 4, 'teacher')
ON CONFLICT DO NOTHING;

-- Default teacher badges (own sessions/students, not a network's)
INSERT INTO badge_definitions (code, label, description, icon, criteria_type, threshold, sort_order, audience) VALUES
    ('t_first_session',    'First Flight',  'Delivered your first session',  'Rocket', 'sessions_done',    1,   1, 'teacher'),
    ('t_ten_sessions',     'Seasoned',      'Delivered 10 sessions',         'Medal',  'sessions_done',    10,  2, 'teacher'),
    ('t_hundred_students', 'Classroom Hero','Reached 100 students',          'Users',  'students_reached', 100, 3, 'teacher'),
    ('t_five_hundred',     'Star Teacher',  'Reached 500 students',          'Star',   'students_reached', 500, 4, 'teacher')
ON CONFLICT (code) DO NOTHING;

-- Create your first admin (set a real bcrypt hash, or register then UPDATE):
-- INSERT INTO users (full_name, email, password_hash, role, status)
-- VALUES ('Admin', 'admin@spacepoint.ae', '<bcrypt-hash>', 'admin', 'active');
