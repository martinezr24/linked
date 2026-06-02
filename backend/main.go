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
	"strings"
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

type ListItem struct {
	ID       string  `json:"id"`
	Text     string  `json:"text"`
	Note     *string `json:"note,omitempty"`
	ListType string  `json:"listType"`
}

type WeeklyGoal struct {
	ID         string `json:"id"`
	GoalText   string `json:"goalText"`
	WeekStart  string `json:"weekStart"`
	Done       bool   `json:"done"`
}

type SharedEvent struct {
	ID         string  `json:"id"`
	Title      string  `json:"title"`
	EventAt    string  `json:"eventAt"`
	OwnerLabel *string `json:"ownerLabel,omitempty"`
}

type User struct {
	ID             string
	DeviceID       string
	RelationshipID *string
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
		`SELECT id, device_id, relationship_id FROM users WHERE device_id = $1`, deviceID,
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

func requireDeviceID(w http.ResponseWriter, r *http.Request) (string, bool) {
	deviceID := r.Header.Get("X-Device-Id")
	if deviceID == "" {
		http.Error(w, "missing X-Device-Id header", http.StatusBadRequest)
		return "", false
	}
	return deviceID, true
}

func weekStartUTC(t time.Time) time.Time {
	t = t.UTC()
	weekday := int(t.Weekday())
	if weekday == 0 {
		weekday = 7
	}
	return time.Date(t.Year(), t.Month(), t.Day()-(weekday-1), 0, 0, 0, 0, time.UTC)
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

	defer func() {
		clientsMu.Lock()
		delete(clients, ws)
		clientsMu.Unlock()
		ws.Close()
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

func normalizeListType(listType string) string {
	if listType == "reunion" {
		return "reunion"
	}
	return "trip"
}

func processIncomingPayload(rawMessage []byte, relationshipID string) {
	var envelope MessageEnvelope
	if err := json.Unmarshal(rawMessage, &envelope); err != nil {
		return
	}

	switch envelope.Action {
	case "ADD_ITEM":
		var item ListItem
		if err := json.Unmarshal(envelope.Payload, &item); err != nil {
			return
		}
		listType := normalizeListType(item.ListType)
		var note interface{}
		if item.Note != nil {
			note = *item.Note
		}
		_, _ = db.Exec(
			`INSERT INTO itinerary_items (id, text, note, list_type, relationship_id)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (id) DO NOTHING`,
			item.ID, item.Text, note, listType, relationshipID,
		)

	case "DELETE_ITEM":
		var item ListItem
		if err := json.Unmarshal(envelope.Payload, &item); err != nil {
			return
		}
		listType := normalizeListType(item.ListType)
		_, _ = db.Exec(
			`DELETE FROM itinerary_items WHERE id = $1 AND relationship_id = $2 AND list_type = $3`,
			item.ID, relationshipID, listType,
		)

	case "SET_NEXT_VISIT":
		var body struct {
			NextVisitAt *string `json:"nextVisitAt"`
		}
		if err := json.Unmarshal(envelope.Payload, &body); err != nil {
			return
		}
		if body.NextVisitAt == nil || *body.NextVisitAt == "" {
			_, _ = db.Exec(`UPDATE relationships SET next_visit_at = NULL WHERE id = $1`, relationshipID)
			return
		}
		t, err := time.Parse(time.RFC3339, *body.NextVisitAt)
		if err != nil {
			return
		}
		_, _ = db.Exec(`UPDATE relationships SET next_visit_at = $1 WHERE id = $2`, t, relationshipID)

	case "SET_WEEKLY_GOAL":
		var body struct {
			GoalText string `json:"goalText"`
		}
		if err := json.Unmarshal(envelope.Payload, &body); err != nil || strings.TrimSpace(body.GoalText) == "" {
			return
		}
		ws := weekStartUTC(time.Now())
		_, _ = db.Exec(
			`INSERT INTO weekly_goals (relationship_id, goal_text, week_start, done)
             VALUES ($1, $2, $3, FALSE)
             ON CONFLICT (relationship_id, week_start)
             DO UPDATE SET goal_text = EXCLUDED.goal_text`,
			relationshipID, strings.TrimSpace(body.GoalText), ws.Format("2006-01-02"),
		)

	case "TOGGLE_WEEKLY_GOAL":
		ws := weekStartUTC(time.Now())
		_, _ = db.Exec(
			`UPDATE weekly_goals SET done = NOT done
             WHERE relationship_id = $1 AND week_start = $2`,
			relationshipID, ws.Format("2006-01-02"),
		)

	case "ADD_EVENT":
		var ev SharedEvent
		if err := json.Unmarshal(envelope.Payload, &ev); err != nil {
			return
		}
		t, err := time.Parse(time.RFC3339, ev.EventAt)
		if err != nil {
			return
		}
		var owner interface{}
		if ev.OwnerLabel != nil {
			owner = *ev.OwnerLabel
		}
		_, _ = db.Exec(
			`INSERT INTO shared_events (id, relationship_id, title, event_at, owner_label)
             VALUES ($1, $2, $3, $4, $5) ON CONFLICT (id) DO NOTHING`,
			ev.ID, relationshipID, ev.Title, t, owner,
		)

	case "DELETE_EVENT":
		var ev SharedEvent
		if err := json.Unmarshal(envelope.Payload, &ev); err != nil {
			return
		}
		_, _ = db.Exec(
			`DELETE FROM shared_events WHERE id = $1 AND relationship_id = $2`,
			ev.ID, relationshipID,
		)
	}
}

func queryListItems(relationshipID, listType string) ([]ListItem, error) {
	rows, err := db.Query(
		`SELECT id, text, note FROM itinerary_items
         WHERE relationship_id = $1 AND list_type = $2 ORDER BY created_at ASC`,
		relationshipID, listType,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []ListItem{}
	for rows.Next() {
		var item ListItem
		var note sql.NullString
		if err := rows.Scan(&item.ID, &item.Text, &note); err == nil {
			item.ListType = listType
			if note.Valid {
				n := note.String
				item.Note = &n
			}
			items = append(items, item)
		}
	}
	return items, nil
}

func handleGetList(w http.ResponseWriter, r *http.Request) {
	if applyCORS(w, r) {
		return
	}
	deviceID, ok := requireDeviceID(w, r)
	if !ok {
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

	listType := normalizeListType(r.URL.Query().Get("type"))
	items, err := queryListItems(relationshipID, listType)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(items)
}

func handleGetItinerary(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	if q.Get("type") == "" {
		q.Set("type", "trip")
	}
	r.URL.RawQuery = q.Encode()
	handleGetList(w, r)
}

func getCurrentWeeklyGoal(relationshipID string) (*WeeklyGoal, error) {
	ws := weekStartUTC(time.Now())
	var g WeeklyGoal
	err := db.QueryRow(
		`SELECT id, goal_text, week_start, done FROM weekly_goals
         WHERE relationship_id = $1 AND week_start = $2`,
		relationshipID, ws.Format("2006-01-02"),
	).Scan(&g.ID, &g.GoalText, &g.WeekStart, &g.Done)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &g, nil
}

func handleGetWeeklyGoal(w http.ResponseWriter, r *http.Request) {
	if applyCORS(w, r) {
		return
	}
	deviceID, ok := requireDeviceID(w, r)
	if !ok {
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
	goal, err := getCurrentWeeklyGoal(relationshipID)
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(goal)
}

func handlePutWeeklyGoal(w http.ResponseWriter, r *http.Request) {
	if applyCORS(w, r) {
		return
	}
	if r.Method != http.MethodPut {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	deviceID, ok := requireDeviceID(w, r)
	if !ok {
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

	var body struct {
		GoalText string `json:"goalText"`
		Done     *bool  `json:"done"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}

	ws := weekStartUTC(time.Now())
	wsStr := ws.Format("2006-01-02")

	if body.Done != nil {
		_, err = db.Exec(
			`INSERT INTO weekly_goals (relationship_id, goal_text, week_start, done)
             VALUES ($1, COALESCE(NULLIF($2, ''), 'Weekly connection'), $3, $4)
             ON CONFLICT (relationship_id, week_start)
             DO UPDATE SET done = EXCLUDED.done`,
			relationshipID, strings.TrimSpace(body.GoalText), wsStr, *body.Done,
		)
	} else {
		text := strings.TrimSpace(body.GoalText)
		if text == "" {
			http.Error(w, "goalText required", http.StatusBadRequest)
			return
		}
		_, err = db.Exec(
			`INSERT INTO weekly_goals (relationship_id, goal_text, week_start, done)
             VALUES ($1, $2, $3, FALSE)
             ON CONFLICT (relationship_id, week_start)
             DO UPDATE SET goal_text = EXCLUDED.goal_text`,
			relationshipID, text, wsStr,
		)
	}
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}

	goal, _ := getCurrentWeeklyGoal(relationshipID)
	json.NewEncoder(w).Encode(goal)
}

func handleGetRelationship(w http.ResponseWriter, r *http.Request) {
	if applyCORS(w, r) {
		return
	}
	deviceID, ok := requireDeviceID(w, r)
	if !ok {
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

	var nextVisit sql.NullTime
	err = db.QueryRow(
		`SELECT next_visit_at FROM relationships WHERE id = $1`, relationshipID,
	).Scan(&nextVisit)
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}

	resp := map[string]any{"relationshipId": relationshipID}
	if nextVisit.Valid {
		resp["nextVisitAt"] = nextVisit.Time.UTC().Format(time.RFC3339)
	} else {
		resp["nextVisitAt"] = nil
	}
	json.NewEncoder(w).Encode(resp)
}

func handlePutRelationshipVisit(w http.ResponseWriter, r *http.Request) {
	if applyCORS(w, r) {
		return
	}
	if r.Method != http.MethodPut {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	deviceID, ok := requireDeviceID(w, r)
	if !ok {
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

	var body struct {
		NextVisitAt *string `json:"nextVisitAt"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}

	if body.NextVisitAt == nil || *body.NextVisitAt == "" {
		_, err = db.Exec(`UPDATE relationships SET next_visit_at = NULL WHERE id = $1`, relationshipID)
	} else {
		t, parseErr := time.Parse(time.RFC3339, *body.NextVisitAt)
		if parseErr != nil {
			http.Error(w, "invalid nextVisitAt", http.StatusBadRequest)
			return
		}
		_, err = db.Exec(`UPDATE relationships SET next_visit_at = $1 WHERE id = $2`, t, relationshipID)
	}
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}

	handleGetRelationship(w, r)
}

func handleGetEvents(w http.ResponseWriter, r *http.Request) {
	if applyCORS(w, r) {
		return
	}
	deviceID, ok := requireDeviceID(w, r)
	if !ok {
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
		`SELECT id, title, event_at, owner_label FROM shared_events
         WHERE relationship_id = $1 ORDER BY event_at ASC`,
		relationshipID,
	)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	events := []SharedEvent{}
	for rows.Next() {
		var ev SharedEvent
		var at time.Time
		var owner sql.NullString
		if err := rows.Scan(&ev.ID, &ev.Title, &at, &owner); err == nil {
			ev.EventAt = at.UTC().Format(time.RFC3339)
			if owner.Valid {
				o := owner.String
				ev.OwnerLabel = &o
			}
			events = append(events, ev)
		}
	}
	json.NewEncoder(w).Encode(events)
}

func handlePostEvent(w http.ResponseWriter, r *http.Request) {
	if applyCORS(w, r) {
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	deviceID, ok := requireDeviceID(w, r)
	if !ok {
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

	var ev SharedEvent
	if err := json.NewDecoder(r.Body).Decode(&ev); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}
	t, err := time.Parse(time.RFC3339, ev.EventAt)
	if err != nil {
		http.Error(w, "invalid eventAt", http.StatusBadRequest)
		return
	}
	var owner interface{}
	if ev.OwnerLabel != nil {
		owner = *ev.OwnerLabel
	}
	_, err = db.Exec(
		`INSERT INTO shared_events (id, relationship_id, title, event_at, owner_label)
         VALUES ($1, $2, $3, $4, $5)`,
		ev.ID, relationshipID, ev.Title, t, owner,
	)
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(ev)
}

func handleDeleteEvent(w http.ResponseWriter, r *http.Request) {
	if applyCORS(w, r) {
		return
	}
	if r.Method != http.MethodDelete {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	deviceID, ok := requireDeviceID(w, r)
	if !ok {
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

	eventID := strings.TrimPrefix(r.URL.Path, "/api/events/")
	if eventID == "" || eventID == r.URL.Path {
		http.Error(w, "missing event id", http.StatusBadRequest)
		return
	}
	_, err = db.Exec(
		`DELETE FROM shared_events WHERE id = $1 AND relationship_id = $2`,
		eventID, relationshipID,
	)
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func deleteRelationshipData(tx *sql.Tx, relationshipID string) error {
	tables := []string{
		`DELETE FROM itinerary_items WHERE relationship_id = $1`,
		`DELETE FROM weekly_goals WHERE relationship_id = $1`,
		`DELETE FROM shared_events WHERE relationship_id = $1`,
	}
	for _, q := range tables {
		if _, err := tx.Exec(q, relationshipID); err != nil {
			return err
		}
	}
	return nil
}

func handlePairingUnlink(w http.ResponseWriter, r *http.Request) {
	if applyCORS(w, r) {
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
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

	if err = deleteRelationshipData(tx, relationshipID); err != nil {
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

	json.NewEncoder(w).Encode(map[string]bool{"ok": true})
}

func main() {
	initDB()
	defer db.Close()

	http.HandleFunc("/ws", handleConnections)
	http.HandleFunc("/api/itinerary", handleGetItinerary)
	http.HandleFunc("/api/lists", handleGetList)
	http.HandleFunc("/api/relationship", handleGetRelationship)
	http.HandleFunc("/api/relationship/visit", handlePutRelationshipVisit)
	http.HandleFunc("/api/goals/current", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPut {
			handlePutWeeklyGoal(w, r)
			return
		}
		handleGetWeeklyGoal(w, r)
	})
	http.HandleFunc("/api/events", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			handlePostEvent(w, r)
			return
		}
		handleGetEvents(w, r)
	})
	http.HandleFunc("/api/events/", handleDeleteEvent)
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
		http.Error(w, "already paired", http.StatusBadRequest)
		return
	}

	b := make([]byte, 3)
	rand.Read(b)
	code := fmt.Sprintf("%06d", (int(b[0])<<16|int(b[1])<<8|int(b[2]))%1000000)
	expiresAt := time.Now().Add(10 * time.Minute)

	db.Exec(`DELETE FROM pairing_codes WHERE creator_user_id = $1`, user.ID)
	_, err = db.Exec(
		`INSERT INTO pairing_codes (code, creator_user_id, expires_at) VALUES ($1, $2, $3)`,
		code, user.ID, expiresAt,
	)
	if err != nil {
		http.Error(w, "failed to create code", http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(map[string]any{"code": code, "expiresAt": expiresAt})
}

func handlePairingLink(w http.ResponseWriter, r *http.Request) {
	if applyCORS(w, r) {
		return
	}
	deviceID, ok := requireDeviceID(w, r)
	if !ok {
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
		`SELECT creator_user_id, expires_at FROM pairing_codes WHERE code = $1 FOR UPDATE`,
		body.Code,
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
	err = tx.QueryRow(`INSERT INTO relationships DEFAULT VALUES RETURNING id`).Scan(&relationshipID)
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

	json.NewEncoder(w).Encode(map[string]any{"relationshipId": relationshipID})
}

func handlePairingStatus(w http.ResponseWriter, r *http.Request) {
	if applyCORS(w, r) {
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

	json.NewEncoder(w).Encode(map[string]any{"relationshipId": user.RelationshipID})
}

func applyCORS(w http.ResponseWriter, r *http.Request) bool {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-Device-Id")
	w.Header().Set("Content-Type", "application/json")

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return true
	}
	return false
}
