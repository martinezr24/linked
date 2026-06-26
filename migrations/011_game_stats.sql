-- All-time per-player win/loss/draw record for each grid game type.
CREATE TABLE IF NOT EXISTS game_stats (
    relationship_id UUID NOT NULL REFERENCES relationships(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    game_type TEXT NOT NULL,
    wins INT NOT NULL DEFAULT 0,
    losses INT NOT NULL DEFAULT 0,
    draws INT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (relationship_id, user_id, game_type)
);
