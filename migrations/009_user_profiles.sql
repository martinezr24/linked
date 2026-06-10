ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_picture_url TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS calendar_color TEXT NOT NULL DEFAULT '#C44B6E';
ALTER TABLE users ADD COLUMN IF NOT EXISTS battery_percent SMALLINT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status_message TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS status_updated_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_calendar_color_hex'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_calendar_color_hex
      CHECK (calendar_color ~ '^#[0-9A-Fa-f]{6}$');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_battery_percent_range'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_battery_percent_range
      CHECK (battery_percent IS NULL OR (battery_percent >= 0 AND battery_percent <= 100));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'users_status_message_len'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_status_message_len
      CHECK (status_message IS NULL OR char_length(status_message) <= 80);
  END IF;
END $$;
