-- Schema for linked_db. Run via: ./scripts/setup-database.sh

CREATE TABLE IF NOT EXISTS itinerary_items (
    id VARCHAR(50) PRIMARY KEY,
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
