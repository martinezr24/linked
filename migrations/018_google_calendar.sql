-- Google Calendar OAuth token storage (one row per user who has connected).
CREATE TABLE IF NOT EXISTS google_oauth_tokens (
  user_id       UUID        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  access_token  TEXT        NOT NULL,
  refresh_token TEXT        NOT NULL,
  expiry        TIMESTAMPTZ NOT NULL,
  email         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Track which Orbit events have been mirrored into the user's Google Calendar
-- so we can delete them when the event is removed from Orbit.
ALTER TABLE shared_events ADD COLUMN IF NOT EXISTS google_event_id TEXT;
