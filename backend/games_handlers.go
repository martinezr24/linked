package main

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/martinezr24/linked-backend/internal/games"
)

var gameManager *games.Manager

func initGameManager() {
	gameManager = games.NewManager(db, func(relationshipID, action string, payload map[string]any) {
		broadcastServerEvent(relationshipID, action, payload)
	})
}

func handleGridGamesActive(w http.ResponseWriter, r *http.Request) {
	if applyCORS(w, r) || r.Method != http.MethodGet {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
		return
	}
	deviceID, ok := requireDeviceID(w, r)
	if !ok {
		return
	}
	user, err := getOrCreateUser(deviceID)
	if err != nil || user.RelationshipID == nil {
		http.Error(w, "not paired", http.StatusForbidden)
		return
	}
	gameType := r.URL.Query().Get("type")
	if gameType == "" {
		gameType = games.Connect4Type
	}
	dto, err := gameManager.GetActiveGame(*user.RelationshipID, user.ID, gameType)
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(dto)
}

func handleGridGamesCreate(w http.ResponseWriter, r *http.Request) {
	if applyCORS(w, r) || r.Method != http.MethodPost {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
		return
	}
	deviceID, ok := requireDeviceID(w, r)
	if !ok {
		return
	}
	user, err := getOrCreateUser(deviceID)
	if err != nil || user.RelationshipID == nil {
		http.Error(w, "not paired", http.StatusForbidden)
		return
	}
	var body struct {
		GameType string `json:"gameType"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}
	gameType := strings.TrimSpace(body.GameType)
	if gameType == "" {
		gameType = games.Connect4Type
	}
	dto, err := gameManager.CreateGame(*user.RelationshipID, user.ID, gameType)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(dto)
	broadcastServerEvent(*user.RelationshipID, "SYNC_GAMES", map[string]any{})
	gameManager.BroadcastGameState(*user.RelationshipID, dto.ID, user.ID)
}

func handleGridGameStats(w http.ResponseWriter, r *http.Request) {
	if applyCORS(w, r) || r.Method != http.MethodGet {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
		return
	}
	deviceID, ok := requireDeviceID(w, r)
	if !ok {
		return
	}
	user, err := getOrCreateUser(deviceID)
	if err != nil || user.RelationshipID == nil {
		http.Error(w, "not paired", http.StatusForbidden)
		return
	}
	gameType := r.URL.Query().Get("type")
	if gameType == "" {
		gameType = games.Connect4Type
	}
	var partnerID string
	_ = db.QueryRow(
		`SELECT id::text FROM users WHERE relationship_id = $1 AND id != $2 LIMIT 1`,
		*user.RelationshipID, user.ID,
	).Scan(&partnerID)
	stats, err := gameManager.GameStats(*user.RelationshipID, user.ID, partnerID, gameType)
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(stats)
}

func handleGridGameByID(w http.ResponseWriter, r *http.Request) {
	if applyCORS(w, r) {
		return
	}
	deviceID, ok := requireDeviceID(w, r)
	if !ok {
		return
	}
	user, err := getOrCreateUser(deviceID)
	if err != nil || user.RelationshipID == nil {
		http.Error(w, "not paired", http.StatusForbidden)
		return
	}
	path := strings.TrimPrefix(r.URL.Path, "/api/games/grid/")
	parts := strings.Split(path, "/")
	if len(parts) == 0 || parts[0] == "" {
		http.Error(w, "bad path", http.StatusBadRequest)
		return
	}
	gameID := parts[0]
	if len(parts) >= 2 && parts[1] == "join" && r.Method == http.MethodPost {
		dto, err := gameManager.JoinGame(*user.RelationshipID, gameID, user.ID)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		json.NewEncoder(w).Encode(dto)
		broadcastServerEvent(*user.RelationshipID, "SYNC_GAMES", map[string]any{})
		return
	}
	if len(parts) >= 2 && parts[1] == "end" && r.Method == http.MethodPost {
		if err := gameManager.EndGame(*user.RelationshipID, gameID, user.ID); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		json.NewEncoder(w).Encode(map[string]any{"ok": true})
		broadcastServerEvent(*user.RelationshipID, "SYNC_GAMES", map[string]any{})
		return
	}
	if len(parts) >= 2 && parts[1] == "move" && r.Method == http.MethodPost {
		var body struct {
			Move json.RawMessage `json:"move"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			http.Error(w, "invalid body", http.StatusBadRequest)
			return
		}
		if err := gameManager.HandleMove(*user.RelationshipID, gameID, user.ID, body.Move); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		dto, _ := gameManager.LoadGame(gameID, user.ID)
		json.NewEncoder(w).Encode(dto)
		return
	}
	if r.Method == http.MethodGet {
		dto, err := gameManager.LoadGame(gameID, user.ID)
		if err != nil {
			http.Error(w, "not found", http.StatusNotFound)
			return
		}
		json.NewEncoder(w).Encode(dto)
		return
	}
	http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
}

func registerGridGameRoutes() {
	http.HandleFunc("/api/games/grid/active", handleGridGamesActive)
	http.HandleFunc("/api/games/grid/stats", handleGridGameStats)
	http.HandleFunc("/api/games/grid", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/api/games/grid" || r.URL.Path == "/api/games/grid/" {
			handleGridGamesCreate(w, r)
			return
		}
		handleGridGameByID(w, r)
	})
	http.HandleFunc("/api/games/grid/", handleGridGameByID)
}
