-- Close gap: owner_label exists in init script but not in 007
ALTER TABLE shared_events
  ADD COLUMN IF NOT EXISTS owner_label TEXT;

-- Structured owner for color coding (replaces free-text in UI)
ALTER TABLE shared_events
  ADD COLUMN IF NOT EXISTS owner_type TEXT NOT NULL DEFAULT 'shared';

ALTER TABLE shared_events
  DROP CONSTRAINT IF EXISTS shared_events_owner_type_check;

ALTER TABLE shared_events
  ADD CONSTRAINT shared_events_owner_type_check
  CHECK (owner_type IN ('self', 'partner', 'shared'));

-- Best-effort backfill from legacy owner_label
UPDATE shared_events SET owner_type = 'self'
  WHERE owner_type = 'shared'
    AND owner_label IS NOT NULL
    AND lower(trim(owner_label)) IN ('me', 'mine', 'you', 'self', 'my');

UPDATE shared_events SET owner_type = 'partner'
  WHERE owner_type = 'shared'
    AND owner_label IS NOT NULL
    AND lower(trim(owner_label)) IN ('partner', 'them', 'their', 'his', 'hers');
