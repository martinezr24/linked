package main

import (
	"encoding/json"
	"net/http"
	"os"
)

func devToolsEnabled() bool {
	return os.Getenv("ENABLE_DEV_TOOLS") == "true"
}

func handleDevPairSolo(w http.ResponseWriter, r *http.Request) {
	if applyCORS(w, r) {
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	if !devToolsEnabled() {
		http.NotFound(w, r)
		return
	}

	deviceID, ok := requireDeviceID(w, r)
	if !ok {
		return
	}

	user, err := getOrCreateUser(deviceID)
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	if user.RelationshipID != nil {
		json.NewEncoder(w).Encode(map[string]any{"relationshipId": *user.RelationshipID})
		return
	}

	tx, err := db.Begin()
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	var relationshipID string
	if err := tx.QueryRow(`INSERT INTO relationships DEFAULT VALUES RETURNING id`).Scan(&relationshipID); err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}

	partnerDeviceID := "dev-partner-" + relationshipID
	_, err = tx.Exec(
		`INSERT INTO users (device_id, relationship_id, display_name, calendar_color)
         VALUES ($1, $2, $3, $4)`,
		partnerDeviceID, relationshipID, "Dev Partner", "#3A2A5C",
	)
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}

	if _, err = tx.Exec(
		`UPDATE users SET relationship_id = $1 WHERE id = $2`,
		relationshipID, user.ID,
	); err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}

	if err = tx.Commit(); err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]any{"relationshipId": relationshipID})
}
