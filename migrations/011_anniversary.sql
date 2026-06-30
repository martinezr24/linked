-- Couple anniversary / "together since" date.
ALTER TABLE relationships
    ADD COLUMN IF NOT EXISTS anniversary_at DATE;
