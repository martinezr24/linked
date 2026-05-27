-- Couples “room”
CREATE TABLE IF NOT EXISTS relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
-- Individual users
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- how you identify/log them in:
    device_id TEXT UNIQUE NOT NULL,             -- or device_id, phone, etc.
    relationship_id UUID REFERENCES relationships(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
-- Temporary pairing codes
CREATE TABLE IF NOT EXISTS pairing_codes (
    code VARCHAR(6) PRIMARY KEY,    -- e.g. A1B2C3
    creator_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_pairing_codes_expires_at
    ON pairing_codes (expires_at);
-- Optional safety: at most 2 users per relationship
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_relationship_max_two
    ON users (relationship_id, id)
    WHERE relationship_id IS NOT NULL;

ALTER TABLE itinerary_items
    ADD COLUMN IF NOT EXISTS relationship_id UUID REFERENCES relationships(id);
CREATE INDEX IF NOT EXISTS idx_itinerary_items_relationship
    ON itinerary_items (relationship_id);