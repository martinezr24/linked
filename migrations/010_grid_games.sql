CREATE TABLE IF NOT EXISTS grid_games (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    relationship_id UUID NOT NULL REFERENCES relationships(id) ON DELETE CASCADE,
    game_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'waiting',
    board_state JSONB NOT NULL DEFAULT '{}',
    current_turn_user_id UUID REFERENCES users(id),
    winner_user_id UUID REFERENCES users(id),
    player_x_user_id UUID NOT NULL REFERENCES users(id),
    player_o_user_id UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_grid_games_relationship_active
  ON grid_games (relationship_id, status)
  WHERE status IN ('waiting', 'active');
