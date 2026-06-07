ALTER TABLE shared_events
  ADD COLUMN IF NOT EXISTS start_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS end_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS all_day BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS recurrence_rule TEXT,
  ADD COLUMN IF NOT EXISTS color TEXT;

UPDATE shared_events
SET start_at = event_at, end_at = event_at
WHERE start_at IS NULL;

ALTER TABLE shared_events ALTER COLUMN start_at SET NOT NULL;
ALTER TABLE shared_events ALTER COLUMN end_at SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_shared_events_range
  ON shared_events (relationship_id, start_at, end_at);
