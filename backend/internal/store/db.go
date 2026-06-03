package store

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/lib/pq"

	"github.com/martinezr24/linked-backend/internal/migrate"
	linkedws "github.com/martinezr24/linked-backend/internal/ws"
)

func Open() (*sql.DB, *linkedws.Hub, error) {
	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		connStr = "dbname=linked_db sslmode=disable host=localhost"
	}

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, nil, fmt.Errorf("open database: %w", err)
	}
	if err = db.Ping(); err != nil {
		db.Close()
		return nil, nil, fmt.Errorf("ping database: %w", err)
	}

	hub := linkedws.NewHub()

	migrationsDir := os.Getenv("MIGRATIONS_DIR")
	if migrationsDir == "" {
		migrationsDir = "../migrations"
	}
	if err := migrate.Run(db, migrationsDir); err != nil {
		log.Printf("Warning: migrations: %v", err)
	}

	fmt.Println("Successfully connected to PostgreSQL database!")
	return db, hub, nil
}
