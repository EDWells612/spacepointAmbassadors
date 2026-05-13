-- PostgreSQL schema for Spacepoint Ambassador Portal
-- Run this to update an existing DB, or from scratch

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- system_settings
CREATE TABLE IF NOT EXISTS system_settings (
    key   VARCHAR(255) PRIMARY KEY,
    value VARCHAR(255) NOT NULL
);
INSERT INTO system_settings (key, value) VALUES ('commission_enabled', 'true') ON CONFLICT DO NOTHING;

-- users
CREATE TABLE IF NOT EXISTS users (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            VARCHAR(255) NOT NULL,
    email           VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    role            VARCHAR(50)  NOT NULL,        -- 'admin', 'ambassador', 'teacher'
    country         VARCHAR(100),
    invite_code     VARCHAR(100) UNIQUE,           -- generated for ambassadors
    status          VARCHAR(50)  DEFAULT 'pending',-- 'pending', 'active', 'rejected'
    invited_by_id   UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- leads
CREATE TABLE IF NOT EXISTS leads (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ambassador_id UUID REFERENCES users(id) ON DELETE CASCADE,
    contact_name  VARCHAR(255) NOT NULL,
    company       VARCHAR(255) NOT NULL,
    type          VARCHAR(50)  NOT NULL,           -- 'B2B', 'distributor'
    status        VARCHAR(50)  DEFAULT 'submitted',-- 'submitted', 'in review', 'converted', 'closed'
    notes         TEXT,
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- tasks
CREATE TABLE IF NOT EXISTS tasks (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    assigned_to   UUID REFERENCES users(id) ON DELETE CASCADE,
    created_by    UUID REFERENCES users(id) ON DELETE SET NULL,  -- ← was missing
    title         VARCHAR(255) NOT NULL,
    description   TEXT,
    deadline      TIMESTAMP WITH TIME ZONE,
    status        VARCHAR(50)  DEFAULT 'pending',  -- 'pending','accepted','submitted','approved','rejected'
    points_reward INTEGER NOT NULL DEFAULT 0,
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- teacher_sessions
CREATE TABLE IF NOT EXISTS teacher_sessions (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    teacher_id    UUID REFERENCES users(id) ON DELETE CASCADE,
    title         VARCHAR(255) NOT NULL,
    date          TIMESTAMP WITH TIME ZONE NOT NULL,
    status        VARCHAR(50)  DEFAULT 'pending',  -- 'pending', 'approved', 'done'
    material_sent BOOLEAN DEFAULT FALSE,
    created_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- instructors
CREATE TABLE IF NOT EXISTS instructors (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invited_by  UUID REFERENCES users(id) ON DELETE CASCADE,
    name        VARCHAR(255) NOT NULL,
    email       VARCHAR(255) NOT NULL,
    status      VARCHAR(50)  DEFAULT 'pending',    -- 'pending', 'active', 'rejected'
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- points_transactions
CREATE TABLE IF NOT EXISTS points_transactions (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ambassador_id  UUID REFERENCES users(id) ON DELETE CASCADE,
    amount         INTEGER NOT NULL,
    type           VARCHAR(50) NOT NULL,            -- 'earn', 'redeem'
    reason         TEXT NOT NULL,
    created_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- commission_transactions
CREATE TABLE IF NOT EXISTS commission_transactions (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ambassador_id  UUID REFERENCES users(id) ON DELETE CASCADE,
    amount         DECIMAL(10, 2) NOT NULL,
    type           VARCHAR(50) NOT NULL,            -- 'earn', 'redeem'
    lead_id        UUID REFERENCES leads(id) ON DELETE SET NULL,
    created_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- swag_items
CREATE TABLE IF NOT EXISTS swag_items (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name        VARCHAR(255) NOT NULL,
    description TEXT,
    points_cost INTEGER NOT NULL,
    image_url   TEXT,
    active      BOOLEAN DEFAULT TRUE,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- redemption_orders
CREATE TABLE IF NOT EXISTS redemption_orders (
    id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ambassador_id  UUID REFERENCES users(id) ON DELETE CASCADE,
    item_id        UUID REFERENCES swag_items(id) ON DELETE SET NULL,
    wallet         VARCHAR(50) NOT NULL,            -- 'points', 'commission'
    status         VARCHAR(50) DEFAULT 'pending',   -- 'pending', 'fulfilled', 'rejected'
    address        TEXT NOT NULL,
    amount         DECIMAL(10, 2),                  -- ← was missing; needed for commission redemption & refund
    created_at     TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ── Migration helpers (run these if updating an existing DB) ──
-- ALTER TABLE tasks ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL;
-- ALTER TABLE redemption_orders ADD COLUMN IF NOT EXISTS amount DECIMAL(10,2);
-- ALTER TABLE redemption_orders ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'pending';
-- UPDATE redemption_orders SET status = 'pending' WHERE status IS NULL;