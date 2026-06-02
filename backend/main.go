package main

import (
	"crypto/rand"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"sync"
	"time"

	"github.com/gorilla/websocket"
	_ "github.com/lib/pq"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type wsClient struct {
	conn           *websocket.Conn
	relationshipID string
}

var (
	clients   = make(map[*websocket.Conn]*wsClient)
	clientsMu sync.Mutex
	db        *sql.DB
)

var errNotPaired = errors.New("not paired")

type MessageEnvelope struct {
	Action  string          `json:"action"`
	Payload json.RawMessage `json:"payload"`
}

type ItineraryItem struct {
	ID   string `json:"id"`
	Text string `json:"text"`
}

type User struct {
	ID             string
	DeviceID       string
	RelationshipID *string
}

type PairingCode struct {
	Code          string
	CreatorUserID string
	ExpiresAt     time.Time
}

func initDB() {
	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		connStr = "dbname=linked_db sslmode=disable host=localhost"
	}

	var err error
	db, err = sql.Open("postgres", connStr)
	if err != nil {
		log.Fatalf("Failed to open database: %v", err)
	}

	if err = db.Ping(); err != nil {
		log.Fatalf("Database unreachable: %v", err)
	}

	fmt.Println("Successfully connected to PostgreSQL database!")
}

func getOrCreateUser(deviceID string) (*User, error) {
	var u User
	err := db.QueryRow(
		`SELECT id, device_id, relationship_id
         FROM users WHERE device_id = $1`, deviceID,
	).Scan(&u.ID, &u.DeviceID, &u.RelationshipID)
	if err == sql.ErrNoRows {
		err = db.QueryRow(
			`INSERT INTO users (device_id) VALUES ($1)
             RETURNING id, device_id, relationship_id`, deviceID,
		).Scan(&u.ID, &u.DeviceID, &u.RelationshipID)
	}
	if err != nil {
		return nil, err
	}
	return &u, nil
}

func getRelationshipIDForDevice(deviceID string) (string, error) {
	user, err := getOrCreateUser(deviceID)
	if err != nil {
		return "", err
	}
	if user.RelationshipID == nil {
		return "", errNotPaired
	}
	return *user.RelationshipID, nil
}

func handleConnections(w http.ResponseWriter, r *http.Request) {
	deviceID := r.URL.Query().Get("deviceId")
	if deviceID == "" {
		http.Error(w, "missing deviceId query parameter", http.StatusBadRequest)
		return
	}

	relationshipID, err := getRelationshipIDForDevice(deviceID)
	if err != nil {
		if errors.Is(err, errNotPaired) {
			http.Error(w, "not paired", http.StatusForbidden)
			return
		}
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}

	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade failed: %v", err)
		return
	}

	client := &wsClient{conn: ws, relationshipID: relationshipID}
	clientsMu.Lock()
	clients[ws] = client
	clientsMu.Unlock()

	fmt.Printf("New client connected (relationship %s)! Total: %d\n", relationshipID, len(clients))

	defer func() {
		clientsMu.Lock()
		delete(clients, ws)
		clientsMu.Unlock()
		ws.Close()
		fmt.Println("Client disconnected.")
	}()

	for {
		messageType, message, err := ws.ReadMessage()
		if err != nil {
			break
		}

		processIncomingPayload(message, relationshipID)
		broadcastToRelationship(relationshipID, messageType, message, ws)
	}
}

func broadcastToRelationship(relationshipID string, messageType int, message []byte, exclude *websocket.Conn) {
	clientsMu.Lock()
	defer clientsMu.Unlock()

	for conn, client := range clients {
		if client.relationshipID != relationshipID || conn == exclude {
			continue
		}
		if err := conn.WriteMessage(messageType, message); err != nil {
			conn.Close()
			delete(clients, conn)
		}
	}
}

func processIncomingPayload(rawMessage []byte, relationshipID string) {
	var envelope MessageEnvelope
	if err := json.Unmarshal(rawMessage, &envelope); err != nil {
		fmt.Printf("Invalid JSON: %v\n", err)
		return
	}

	switch envelope.Action {
	case "ADD_ITEM":
		var item ItineraryItem
		if err := json.Unmarshal(envelope.Payload, &item); err != nil {
			fmt.Printf("Invalid ADD_ITEM payload: %v\n", err)
			return
		}
		_, err := db.Exec(
			`INSERT INTO itinerary_items (id, text, relationship_id) VALUES ($1, $2, $3)`,
			item.ID, item.Text, relationshipID,
		)
		if err != nil {
			fmt.Printf("Database write failed for %s: %v\n", item.ID, err)
		} else {
			fmt.Printf("Persisted item: %s\n", item.Text)
		}

	case "DELETE_ITEM":
		var item ItineraryItem
		if err := json.Unmarshal(envelope.Payload, &item); err != nil {
			fmt.Printf("Invalid DELETE_ITEM payload: %v\n", err)
			return
		}
		_, err := db.Exec(
			`DELETE FROM itinerary_items WHERE id = $1 AND relationship_id = $2`,
			item.ID, relationshipID,
		)
		if err != nil {
			fmt.Printf("Database delete failed for %s: %v\n", item.ID, err)
		} else {
			fmt.Printf("Deleted item: %s\n", item.ID)
		}
	}
}

func handleGetItinerary(w http.ResponseWriter, r *http.Request) {
	if applyCORS(w, r) {
		return
	}

	deviceID := r.Header.Get("X-Device-Id")
	if deviceID == "" {
		http.Error(w, "missing X-Device-Id header", http.StatusBadRequest)
		return
	}

	relationshipID, err := getRelationshipIDForDevice(deviceID)
	if err != nil {
		if errors.Is(err, errNotPaired) {
			http.Error(w, "not paired", http.StatusForbidden)
			return
		}
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}

	rows, err := db.Query(
		`SELECT id, text FROM itinerary_items WHERE relationship_id = $1 ORDER BY created_at ASC`,
		relationshipID,
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	items := []ItineraryItem{}
	for rows.Next() {
		var item ItineraryItem
		if err := rows.Scan(&item.ID, &item.Text); err == nil {
			items = append(items, item)
		}
	}

	json.NewEncoder(w).Encode(items)
}

func handlePairingUnlink(w http.ResponseWriter, r *http.Request) {
	if applyCORS(w, r) {
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}

	deviceID := r.Header.Get("X-Device-Id")
	if deviceID == "" {
		http.Error(w, "missing X-Device-Id header", http.StatusBadRequest)
		return
	}

	user, err := getOrCreateUser(deviceID)
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	if user.RelationshipID == nil {
		http.Error(w, "not paired", http.StatusBadRequest)
		return
	}

	relationshipID := *user.RelationshipID

	tx, err := db.Begin()
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	if _, err = tx.Exec(`DELETE FROM itinerary_items WHERE relationship_id = $1`, relationshipID); err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	if _, err = tx.Exec(`UPDATE users SET relationship_id = NULL WHERE relationship_id = $1`, relationshipID); err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	if _, err = tx.Exec(`DELETE FROM relationships WHERE id = $1`, relationshipID); err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}

	if err = tx.Commit(); err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]bool{"ok": true})
}

func main() {
	initDB()
	defer db.Close()

	http.HandleFunc("/ws", handleConnections)
	http.HandleFunc("/api/itinerary", handleGetItinerary)
	http.HandleFunc("/api/pairing/generate", handlePairingGenerate)
	http.HandleFunc("/api/pairing/link", handlePairingLink)
	http.HandleFunc("/api/pairing/status", handlePairingStatus)
	http.HandleFunc("/api/pairing/unlink", handlePairingUnlink)

	fmt.Println("Linked engine running with persistence on :8080...")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

func handlePairingGenerate(w http.ResponseWriter, r *http.Request) {
	if applyCORS(w, r) {
		return
	}

	deviceID := r.Header.Get("X-Device-Id")
	if deviceID == "" {
		http.Error(w, "missing X-Device-Id header", http.StatusBadRequest)
		return
	}

	user, err := getOrCreateUser(deviceID)
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	if user.RelationshipID != nil {
		http.Error(w, "already paired", http.StatusBadRequest)
		return
	}

	b := make([]byte, 3)
	rand.Read(b)
	code := fmt.Sprintf(
		"%06d",
		(int(b[0])<<16|int(b[1])<<8|int(b[2]))%1000000,
	)

	expiresAt := time.Now().Add(10 * time.Minute)

	db.Exec(`DELETE FROM pairing_codes WHERE creator_user_id = $1`, user.ID)

	_, err = db.Exec(
		`INSERT INTO pairing_codes (code, creator_user_id, expires_at)
         VALUES ($1, $2, $3)`, code, user.ID, expiresAt,
	)
	if err != nil {
		http.Error(w, "failed to create code", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"code":      code,
		"expiresAt": expiresAt,
	})
}

func handlePairingLink(w http.ResponseWriter, r *http.Request) {
	if applyCORS(w, r) {
		return
	}

	deviceID := r.Header.Get("X-Device-Id")
	if deviceID == "" {
		http.Error(w, "missing X-Device-Id header", http.StatusBadRequest)
		return
	}

	var body struct {
		Code string `json:"code"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil || body.Code == "" {
		http.Error(w, "missing code", http.StatusBadRequest)
		return
	}

	user, err := getOrCreateUser(deviceID)
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	if user.RelationshipID != nil {
		http.Error(w, "already paired", http.StatusBadRequest)
		return
	}

	tx, err := db.Begin()
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	defer tx.Rollback()

	var creatorUserID string
	var expiresAt time.Time
	err = tx.QueryRow(
		`SELECT creator_user_id, expires_at FROM pairing_codes
         WHERE code = $1 FOR UPDATE`, body.Code,
	).Scan(&creatorUserID, &expiresAt)

	if err == sql.ErrNoRows || time.Now().After(expiresAt) {
		http.Error(w, "invalid or expired code", http.StatusBadRequest)
		return
	}
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	if creatorUserID == user.ID {
		http.Error(w, "cannot pair with yourself", http.StatusBadRequest)
		return
	}

	var relationshipID string
	err = tx.QueryRow(
		`INSERT INTO relationships DEFAULT VALUES RETURNING id`,
	).Scan(&relationshipID)
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}

	_, err = tx.Exec(
		`UPDATE users SET relationship_id = $1 WHERE id IN ($2, $3)`,
		relationshipID, creatorUserID, user.ID,
	)
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}

	tx.Exec(`DELETE FROM pairing_codes WHERE code = $1`, body.Code)

	if err = tx.Commit(); err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"relationshipId": relationshipID,
	})
}

func handlePairingStatus(w http.ResponseWriter, r *http.Request) {
	if applyCORS(w, r) {
		return
	}

	deviceID := r.Header.Get("X-Device-Id")
	if deviceID == "" {
		http.Error(w, "missing X-Device-Id header", http.StatusBadRequest)
		return
	}

	user, err := getOrCreateUser(deviceID)
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]any{
		"relationshipId": user.RelationshipID,
	})
}

func applyCORS(w http.ResponseWriter, r *http.Request) bool {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-Device-Id")
	w.Header().Set("Content-Type", "application/json")

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return true
	}
	return false
}
