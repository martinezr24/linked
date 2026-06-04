CREATE TABLE IF NOT EXISTS daily_photos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    relationship_id UUID NOT NULL REFERENCES relationships(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    photo_date DATE NOT NULL,
    object_key TEXT NOT NULL,
    caption TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, photo_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_photos_relationship_date
  ON daily_photos (relationship_id, photo_date DESC);

CREATE TABLE IF NOT EXISTS photo_streak_meta (
    relationship_id UUID PRIMARY KEY REFERENCES relationships(id) ON DELETE CASCADE,
    longest_streak INT NOT NULL DEFAULT 0
);
