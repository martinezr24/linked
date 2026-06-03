-- Incremental migration: async notes and indexes (safe to re-run)

CREATE TABLE IF NOT EXISTS async_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    relationship_id UUID NOT NULL REFERENCES relationships(id) ON DELETE CASCADE,
    author_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    trigger_type TEXT NOT NULL DEFAULT 'anytime',
    trigger_value TEXT,
    body TEXT NOT NULL,
    opened_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_async_notes_relationship ON async_notes (relationship_id, opened_at);

CREATE INDEX IF NOT EXISTS idx_itinerary_items_list ON itinerary_items (relationship_id, list_type, event_id);

ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone TEXT;
