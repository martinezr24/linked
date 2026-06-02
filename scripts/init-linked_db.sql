-- Couples "room"
CREATE TABLE IF NOT EXISTS relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    next_visit_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Individual users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id TEXT UNIQUE NOT NULL,
    relationship_id UUID REFERENCES relationships(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Temporary pairing codes
CREATE TABLE IF NOT EXISTS pairing_codes (
    code VARCHAR(6) PRIMARY KEY,
    creator_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pairing_codes_expires_at
    ON pairing_codes (expires_at);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_relationship_max_two
    ON users (relationship_id, id)
    WHERE relationship_id IS NOT NULL;

-- Shared lists (trip itinerary + reunion bucket list)
CREATE TABLE IF NOT EXISTS itinerary_items (
    id TEXT PRIMARY KEY,
    text TEXT NOT NULL,
    note TEXT,
    list_type TEXT NOT NULL DEFAULT 'trip',
    relationship_id UUID REFERENCES relationships(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_itinerary_items_relationship
    ON itinerary_items (relationship_id);

CREATE INDEX IF NOT EXISTS idx_itinerary_items_list_type
    ON itinerary_items (relationship_id, list_type);

ALTER TABLE relationships
    ADD COLUMN IF NOT EXISTS next_visit_at TIMESTAMPTZ;

ALTER TABLE itinerary_items
    ADD COLUMN IF NOT EXISTS relationship_id UUID REFERENCES relationships(id) ON DELETE CASCADE;

ALTER TABLE itinerary_items
    ADD COLUMN IF NOT EXISTS list_type TEXT NOT NULL DEFAULT 'trip';

ALTER TABLE itinerary_items
    ADD COLUMN IF NOT EXISTS note TEXT;

-- Weekly connection goals (multiple per week)
CREATE TABLE IF NOT EXISTS weekly_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    relationship_id UUID NOT NULL REFERENCES relationships(id) ON DELETE CASCADE,
    goal_text TEXT NOT NULL,
    week_start DATE NOT NULL,
    done BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE weekly_goals
    DROP CONSTRAINT IF EXISTS weekly_goals_relationship_id_week_start_key;

CREATE INDEX IF NOT EXISTS idx_weekly_goals_relationship_week
    ON weekly_goals (relationship_id, week_start);

-- Shared upcoming events (calendar v0)
CREATE TABLE IF NOT EXISTS shared_events (
    id TEXT PRIMARY KEY,
    relationship_id UUID NOT NULL REFERENCES relationships(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    event_at TIMESTAMPTZ NOT NULL,
    owner_label TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_shared_events_relationship
    ON shared_events (relationship_id, event_at);
