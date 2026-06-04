ALTER TABLE async_notes
  ADD COLUMN IF NOT EXISTS lock_type TEXT NOT NULL DEFAULT 'state';

ALTER TABLE async_notes
  ADD COLUMN IF NOT EXISTS opens_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_async_notes_locked
  ON async_notes (relationship_id, opens_at)
  WHERE opened_at IS NULL;
