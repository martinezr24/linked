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
	"time"

	"github.com/gorilla/websocket"
	_ "github.com/lib/pq"

	"github.com/martinezr24/linked-backend/internal/handlers"
	"github.com/martinezr24/linked-backend/internal/migrate"
	linkedws "github.com/martinezr24/linked-backend/internal/ws"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

var (
	hub *linkedws.Hub
	db  *sql.DB
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
	EventID  *string `json:"eventId,omitempty"`
}

type CheckIn struct {
	ID       string  `json:"id"`
	UserID   string  `json:"userId"`
	CheckDate string `json:"checkDate"`
	Note     *string `json:"note,omitempty"`
	IsMine   bool    `json:"isMine"`
}

type TodayCheckIns struct {
	Mine    *CheckIn `json:"mine"`
	Partner *CheckIn `json:"partner"`
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

type ConnectionStreak struct {
	CurrentStreak      int  `json:"currentStreak"`
	LongestStreak      int  `json:"longestStreak"`
	BothCheckedInToday bool `json:"bothCheckedInToday"`
}

type AsyncNote struct {
	ID           string  `json:"id"`
	TriggerType  string  `json:"triggerType"`
	TriggerValue *string `json:"triggerValue,omitempty"`
	Body         string  `json:"body"`
	IsMine       bool    `json:"isMine"`
	OpenedAt     *string `json:"openedAt,omitempty"`
	CreatedAt    string  `json:"createdAt"`
}

type WidgetSummary struct {
	NextVisitAt      *string `json:"nextVisitAt"`
	NextEventTitle   *string `json:"nextEventTitle"`
	NextEventAt      *string `json:"nextEventAt"`
	PartnerCheckedIn bool    `json:"partnerCheckedIn"`
	MineCheckedIn    bool    `json:"mineCheckedIn"`
	CurrentStreak    int     `json:"currentStreak"`
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
	hub = linkedws.NewHub()

	migrationsDir := os.Getenv("MIGRATIONS_DIR")
	if migrationsDir == "" {
		migrationsDir = "../migrations"
	}
	if err := migrate.Run(db, migrationsDir); err != nil {
		log.Printf("Warning: migrations: %v", err)
	}
}

func broadcastServerEvent(relationshipID, action string, payload map[string]any) {
	if hub == nil {
		return
	}
	hub.BroadcastServerEvent(relationshipID, action, payload)
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

	hub.Register(ws, relationshipID)

	defer func() {
		hub.Unregister(ws)
		ws.Close()
	}()

	for {
		_, message, err := ws.ReadMessage()
		if err != nil {
			break
		}
		// Client WS messages are legacy notify-only; durable writes go through REST.
		processIncomingPayload(message, relationshipID)
	}
}

func normalizeListType(listType string) string {
	switch listType {
	case "reunion":
		return "reunion"
	case "visit":
		return "visit"
	default:
		return "trip"
	}
}

func processIncomingPayload(rawMessage []byte, relationshipID string) {
	var envelope MessageEnvelope
	if err := json.Unmarshal(rawMessage, &envelope); err != nil {
		return
	}

	switch envelope.Action {
	case "ADD_ITEM", "DELETE_ITEM", "SET_NEXT_VISIT",
		"ADD_WEEKLY_GOAL", "UPDATE_WEEKLY_GOAL", "DELETE_WEEKLY_GOAL",
		"ADD_EVENT", "DELETE_EVENT", "CHECK_IN":
		// Notify-only legacy: REST persists and server broadcasts.
	}
}

func queryListItems(relationshipID, listType, eventID string) ([]ListItem, error) {
	var rows *sql.Rows
	var err error

	if listType == "visit" {
		if eventID == "" {
			return nil, fmt.Errorf("eventId required for visit list")
		}
		rows, err = db.Query(
			`SELECT id, text, note, event_id FROM itinerary_items
             WHERE relationship_id = $1 AND list_type = 'visit' AND event_id = $2
             ORDER BY created_at ASC`,
			relationshipID, eventID,
		)
	} else {
		rows, err = db.Query(
			`SELECT id, text, note, event_id FROM itinerary_items
             WHERE relationship_id = $1 AND list_type = $2 AND event_id IS NULL
             ORDER BY created_at ASC`,
			relationshipID, listType,
		)
	}
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	items := []ListItem{}
	for rows.Next() {
		var item ListItem
		var note sql.NullString
		var eid sql.NullString
		if err := rows.Scan(&item.ID, &item.Text, &note, &eid); err == nil {
			item.ListType = listType
			if note.Valid {
				n := note.String
				item.Note = &n
			}
			if eid.Valid {
				e := eid.String
				item.EventID = &e
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
	eventID := r.URL.Query().Get("eventId")
	if listType == "visit" && eventID == "" {
		http.Error(w, "eventId required for visit list", http.StatusBadRequest)
		return
	}
	items, err := queryListItems(relationshipID, listType, eventID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(items)
}

func insertListItem(relationshipID string, item ListItem) error {
	listType := normalizeListType(item.ListType)
	var note interface{}
	if item.Note != nil {
		note = *item.Note
	}
	var eventID interface{}
	if item.EventID != nil && *item.EventID != "" {
		eventID = *item.EventID
	}
	_, err := db.Exec(
		`INSERT INTO itinerary_items (id, text, note, list_type, relationship_id, event_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO NOTHING`,
		item.ID, item.Text, note, listType, relationshipID, eventID,
	)
	return err
}

func deleteListItem(relationshipID, itemID, listType string, eventID *string) error {
	listType = normalizeListType(listType)
	if listType == "visit" && eventID != nil {
		_, err := db.Exec(
			`DELETE FROM itinerary_items WHERE id = $1 AND relationship_id = $2 AND list_type = $3 AND event_id = $4`,
			itemID, relationshipID, listType, *eventID,
		)
		return err
	}
	_, err := db.Exec(
		`DELETE FROM itinerary_items WHERE id = $1 AND relationship_id = $2 AND list_type = $3 AND event_id IS NULL`,
		itemID, relationshipID, listType,
	)
	return err
}

func handlePostListItem(w http.ResponseWriter, r *http.Request) {
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

	var item ListItem
	if err := json.NewDecoder(r.Body).Decode(&item); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}
	if strings.TrimSpace(item.Text) == "" || strings.TrimSpace(item.ID) == "" {
		http.Error(w, "id and text required", http.StatusBadRequest)
		return
	}
	listType := normalizeListType(item.ListType)
	if listType == "visit" && (item.EventID == nil || *item.EventID == "") {
		http.Error(w, "eventId required for visit list", http.StatusBadRequest)
		return
	}
	item.ListType = listType
	if err := insertListItem(relationshipID, item); err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(item)
	broadcastServerEvent(relationshipID, "SYNC_LISTS", map[string]any{
		"listType": listType,
		"eventId":  item.EventID,
	})
}

func handleDeleteListItem(w http.ResponseWriter, r *http.Request) {
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

	itemID := strings.TrimPrefix(r.URL.Path, "/api/lists/items/")
	if itemID == "" || strings.Contains(itemID, "/") {
		http.Error(w, "missing item id", http.StatusBadRequest)
		return
	}
	listType := normalizeListType(r.URL.Query().Get("type"))
	var eventID *string
	if e := r.URL.Query().Get("eventId"); e != "" {
		eventID = &e
	}
	if listType == "visit" && eventID == nil {
		http.Error(w, "eventId required for visit list", http.StatusBadRequest)
		return
	}
	if err := deleteListItem(relationshipID, itemID, listType, eventID); err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
	broadcastServerEvent(relationshipID, "SYNC_LISTS", map[string]any{
		"listType": listType,
		"eventId":  eventID,
	})
}

func handleListItems(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodPost {
		handlePostListItem(w, r)
		return
	}
	if r.Method == http.MethodDelete {
		handleDeleteListItem(w, r)
		return
	}
	http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
}

func handleGetItinerary(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	if q.Get("type") == "" {
		q.Set("type", "trip")
	}
	r.URL.RawQuery = q.Encode()
	handleGetList(w, r)
}

func listCurrentWeeklyGoals(relationshipID string) ([]WeeklyGoal, error) {
	ws := weekStartUTC(time.Now())
	rows, err := db.Query(
		`SELECT id::text, goal_text, week_start, done FROM weekly_goals
         WHERE relationship_id = $1 AND week_start = $2
         ORDER BY created_at ASC`,
		relationshipID, ws.Format("2006-01-02"),
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	goals := []WeeklyGoal{}
	for rows.Next() {
		var g WeeklyGoal
		if err := rows.Scan(&g.ID, &g.GoalText, &g.WeekStart, &g.Done); err == nil {
			goals = append(goals, g)
		}
	}
	return goals, nil
}

func handleGetWeeklyGoals(w http.ResponseWriter, r *http.Request) {
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
	goals, err := listCurrentWeeklyGoals(relationshipID)
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(goals)
}

func handlePostWeeklyGoal(w http.ResponseWriter, r *http.Request) {
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

	var body struct {
		GoalText string `json:"goalText"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}
	text := strings.TrimSpace(body.GoalText)
	if text == "" {
		http.Error(w, "goalText required", http.StatusBadRequest)
		return
	}

	wsStr := weekStartUTC(time.Now()).Format("2006-01-02")
	var g WeeklyGoal
	err = db.QueryRow(
		`INSERT INTO weekly_goals (relationship_id, goal_text, week_start, done)
         VALUES ($1, $2, $3, FALSE)
         RETURNING id::text, goal_text, week_start, done`,
		relationshipID, text, wsStr,
	).Scan(&g.ID, &g.GoalText, &g.WeekStart, &g.Done)
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(g)
	broadcastServerEvent(relationshipID, "SYNC_GOALS", map[string]any{"relationshipId": relationshipID})
}

func handleGoalByID(w http.ResponseWriter, r *http.Request) {
	if applyCORS(w, r) {
		return
	}

	goalID := strings.TrimPrefix(r.URL.Path, "/api/goals/")
	if goalID == "" || goalID == r.URL.Path {
		http.Error(w, "missing goal id", http.StatusBadRequest)
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

	switch r.Method {
	case http.MethodPut:
		var body struct {
			Done bool `json:"done"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			http.Error(w, "invalid body", http.StatusBadRequest)
			return
		}
		var g WeeklyGoal
		err = db.QueryRow(
			`UPDATE weekly_goals SET done = $1
             WHERE id::text = $2 AND relationship_id = $3
             RETURNING id::text, goal_text, week_start, done`,
			body.Done, goalID, relationshipID,
		).Scan(&g.ID, &g.GoalText, &g.WeekStart, &g.Done)
		if err == sql.ErrNoRows {
			http.Error(w, "not found", http.StatusNotFound)
			return
		}
		if err != nil {
			http.Error(w, "db error", http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(g)
		broadcastServerEvent(relationshipID, "SYNC_GOALS", map[string]any{"relationshipId": relationshipID})

	case http.MethodDelete:
		res, err := db.Exec(
			`DELETE FROM weekly_goals WHERE id::text = $1 AND relationship_id = $2`,
			goalID, relationshipID,
		)
		if err != nil {
			http.Error(w, "db error", http.StatusInternalServerError)
			return
		}
		if n, _ := res.RowsAffected(); n == 0 {
			http.Error(w, "not found", http.StatusNotFound)
			return
		}
		w.WriteHeader(http.StatusNoContent)
		broadcastServerEvent(relationshipID, "SYNC_GOALS", map[string]any{"relationshipId": relationshipID})

	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
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
	broadcastServerEvent(relationshipID, "SYNC_RELATIONSHIP", map[string]any{"relationshipId": relationshipID})
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
	broadcastServerEvent(relationshipID, "SYNC_EVENTS", map[string]any{"relationshipId": relationshipID})
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
	_, _ = db.Exec(
		`DELETE FROM itinerary_items WHERE event_id = $1 AND relationship_id = $2`,
		eventID, relationshipID,
	)
	_, err = db.Exec(
		`DELETE FROM shared_events WHERE id = $1 AND relationship_id = $2`,
		eventID, relationshipID,
	)
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
	broadcastServerEvent(relationshipID, "SYNC_EVENTS", map[string]any{"relationshipId": relationshipID})
}

func handleEventByID(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodDelete {
		handleDeleteEvent(w, r)
		return
	}
	handleGetEvent(w, r)
}

func handleGetEvent(w http.ResponseWriter, r *http.Request) {
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

	eventID := strings.TrimPrefix(r.URL.Path, "/api/events/")
	if eventID == "" || strings.Contains(eventID, "/") {
		http.Error(w, "missing event id", http.StatusBadRequest)
		return
	}

	var ev SharedEvent
	var at time.Time
	var owner sql.NullString
	err = db.QueryRow(
		`SELECT id, title, event_at, owner_label FROM shared_events
         WHERE id = $1 AND relationship_id = $2`,
		eventID, relationshipID,
	).Scan(&ev.ID, &ev.Title, &at, &owner)
	if err == sql.ErrNoRows {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	ev.EventAt = at.UTC().Format(time.RFC3339)
	if owner.Valid {
		o := owner.String
		ev.OwnerLabel = &o
	}
	json.NewEncoder(w).Encode(ev)
}

func todayUTC() string {
	return time.Now().UTC().Format("2006-01-02")
}

func clientLocalDate(r *http.Request) string {
	d := strings.TrimSpace(r.Header.Get("X-Local-Date"))
	if len(d) == 10 && d[4] == '-' && d[7] == '-' {
		if _, err := time.Parse("2006-01-02", d); err == nil {
			return d
		}
	}
	return todayUTC()
}

func handleCheckInsToday(w http.ResponseWriter, r *http.Request) {
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
	if user.RelationshipID == nil {
		http.Error(w, "not paired", http.StatusForbidden)
		return
	}
	relationshipID := *user.RelationshipID
	today := clientLocalDate(r)

	if r.Method == http.MethodPost {
		var body struct {
			Note *string `json:"note"`
		}
		json.NewDecoder(r.Body).Decode(&body)
		var note interface{}
		if body.Note != nil && strings.TrimSpace(*body.Note) != "" {
			note = strings.TrimSpace(*body.Note)
		}
		var id string
		err = db.QueryRow(
			`INSERT INTO daily_checkins (user_id, relationship_id, check_date, note)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (user_id, check_date) DO UPDATE SET note = COALESCE(EXCLUDED.note, daily_checkins.note)
             RETURNING id::text`,
			user.ID, relationshipID, today, note,
		).Scan(&id)
		if err != nil {
			http.Error(w, "db error", http.StatusInternalServerError)
			return
		}
	}

	resp, err := buildTodayCheckIns(user.ID, relationshipID, today)
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	if r.Method == http.MethodPost {
		w.WriteHeader(http.StatusCreated)
		broadcastServerEvent(relationshipID, "SYNC_CHECKINS", map[string]any{"relationshipId": relationshipID})
	}
	json.NewEncoder(w).Encode(resp)
}

func buildTodayCheckIns(currentUserID, relationshipID, today string) (TodayCheckIns, error) {
	rows, err := db.Query(
		`SELECT id::text, user_id::text, check_date, note FROM daily_checkins
         WHERE relationship_id = $1 AND check_date = $2`,
		relationshipID, today,
	)
	if err != nil {
		return TodayCheckIns{}, err
	}
	defer rows.Close()

	var resp TodayCheckIns
	for rows.Next() {
		var c CheckIn
		var note sql.NullString
		var checkDate time.Time
		if err := rows.Scan(&c.ID, &c.UserID, &checkDate, &note); err != nil {
			continue
		}
		c.CheckDate = checkDate.Format("2006-01-02")
		if note.Valid {
			n := note.String
			c.Note = &n
		}
		c.IsMine = c.UserID == currentUserID
		if c.IsMine {
			resp.Mine = &c
		} else {
			resp.Partner = &c
		}
	}
	return resp, nil
}

func computeConnectionStreak(relationshipID string) (ConnectionStreak, error) {
	rows, err := db.Query(
		`SELECT check_date, COUNT(DISTINCT user_id) AS user_count
         FROM daily_checkins
         WHERE relationship_id = $1
         GROUP BY check_date
         ORDER BY check_date DESC`,
		relationshipID,
	)
	if err != nil {
		return ConnectionStreak{}, err
	}
	defer rows.Close()

	type dayCount struct {
		date  time.Time
		count int
	}
	var days []dayCount
	for rows.Next() {
		var d dayCount
		if err := rows.Scan(&d.date, &d.count); err == nil {
			days = append(days, d)
		}
	}

	current := 0
	longest := 0
	todayBoth := false
	if len(days) > 0 && days[0].count >= 2 {
		todayBoth = true
	}

	expected := time.Now().UTC()
	for _, d := range days {
		if d.count < 2 {
			break
		}
		dayUTC := time.Date(d.date.Year(), d.date.Month(), d.date.Day(), 0, 0, 0, 0, time.UTC)
		expUTC := time.Date(expected.Year(), expected.Month(), expected.Day(), 0, 0, 0, 0, time.UTC)
		if !dayUTC.Equal(expUTC) {
			break
		}
		current++
		expected = expected.AddDate(0, 0, -1)
	}

	run := 0
	for _, d := range days {
		if d.count >= 2 {
			run++
			if run > longest {
				longest = run
			}
		} else {
			run = 0
		}
	}

	return ConnectionStreak{
		CurrentStreak:      current,
		LongestStreak:      longest,
		BothCheckedInToday: todayBoth,
	}, nil
}

func handleGetStreak(w http.ResponseWriter, r *http.Request) {
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
	streak, err := computeConnectionStreak(relationshipID)
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(streak)
}

func handleAsyncNotes(w http.ResponseWriter, r *http.Request) {
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
	if user.RelationshipID == nil {
		http.Error(w, "not paired", http.StatusForbidden)
		return
	}
	relationshipID := *user.RelationshipID

	switch r.Method {
	case http.MethodGet:
		rows, err := db.Query(
			`SELECT id::text, trigger_type, trigger_value, body, author_user_id::text, opened_at, created_at
             FROM async_notes WHERE relationship_id = $1 ORDER BY created_at DESC`,
			relationshipID,
		)
		if err != nil {
			http.Error(w, "db error", http.StatusInternalServerError)
			return
		}
		defer rows.Close()
		notes := []AsyncNote{}
		for rows.Next() {
			var n AsyncNote
			var authorID string
			var triggerVal sql.NullString
			var opened sql.NullTime
			var created time.Time
			if err := rows.Scan(&n.ID, &n.TriggerType, &triggerVal, &n.Body, &authorID, &opened, &created); err != nil {
				continue
			}
			if triggerVal.Valid {
				v := triggerVal.String
				n.TriggerValue = &v
			}
			n.IsMine = authorID == user.ID
			if opened.Valid {
				s := opened.Time.UTC().Format(time.RFC3339)
				n.OpenedAt = &s
			}
			n.CreatedAt = created.UTC().Format(time.RFC3339)
			notes = append(notes, n)
		}
		json.NewEncoder(w).Encode(notes)

	case http.MethodPost:
		var body struct {
			TriggerType  string  `json:"triggerType"`
			TriggerValue *string `json:"triggerValue"`
			Body         string  `json:"body"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			http.Error(w, "invalid body", http.StatusBadRequest)
			return
		}
		text := strings.TrimSpace(body.Body)
		if text == "" {
			http.Error(w, "body required", http.StatusBadRequest)
			return
		}
		triggerType := strings.TrimSpace(body.TriggerType)
		if triggerType == "" {
			triggerType = "anytime"
		}
		var triggerVal interface{}
		if triggerType == "custom" {
			if body.TriggerValue == nil || strings.TrimSpace(*body.TriggerValue) == "" {
				http.Error(w, "triggerValue required for custom category", http.StatusBadRequest)
				return
			}
			v := strings.TrimSpace(*body.TriggerValue)
			if len(v) > 80 {
				v = v[:80]
			}
			triggerVal = v
		} else if body.TriggerValue != nil && strings.TrimSpace(*body.TriggerValue) != "" {
			triggerVal = strings.TrimSpace(*body.TriggerValue)
		}
		var n AsyncNote
		var created time.Time
		var tv sql.NullString
		err := db.QueryRow(
			`INSERT INTO async_notes (relationship_id, author_user_id, trigger_type, trigger_value, body)
             VALUES ($1, $2, $3, $4, $5)
             RETURNING id::text, trigger_type, trigger_value, body, opened_at, created_at`,
			relationshipID, user.ID, triggerType, triggerVal, text,
		).Scan(&n.ID, &n.TriggerType, &tv, &n.Body, &sql.NullTime{}, &created)
		if err != nil {
			http.Error(w, "db error", http.StatusInternalServerError)
			return
		}
		if tv.Valid {
			v := tv.String
			n.TriggerValue = &v
		}
		n.IsMine = true
		n.CreatedAt = created.UTC().Format(time.RFC3339)
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(n)
		broadcastServerEvent(relationshipID, "SYNC_ASYNC_NOTES", map[string]any{"relationshipId": relationshipID})

	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func handleAsyncNoteByID(w http.ResponseWriter, r *http.Request) {
	path := strings.TrimPrefix(r.URL.Path, "/api/async-notes/")
	if strings.HasSuffix(path, "/open") {
		handleOpenAsyncNote(w, r)
		return
	}
	http.Error(w, "not found", http.StatusNotFound)
}

func handleOpenAsyncNote(w http.ResponseWriter, r *http.Request) {
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
		http.Error(w, "not paired", http.StatusForbidden)
		return
	}
	relationshipID := *user.RelationshipID
	noteID := strings.TrimPrefix(r.URL.Path, "/api/async-notes/")
	noteID = strings.TrimSuffix(noteID, "/open")
	if noteID == "" || strings.Contains(noteID, "/") {
		http.Error(w, "missing note id", http.StatusBadRequest)
		return
	}

	var n AsyncNote
	var authorID string
	var triggerVal sql.NullString
	var opened sql.NullTime
	var created time.Time
	err = db.QueryRow(
		`UPDATE async_notes SET opened_at = COALESCE(opened_at, NOW())
         WHERE id::text = $1 AND relationship_id = $2 AND author_user_id != $3
         RETURNING id::text, trigger_type, trigger_value, body, author_user_id::text, opened_at, created_at`,
		noteID, relationshipID, user.ID,
	).Scan(&n.ID, &n.TriggerType, &triggerVal, &n.Body, &authorID, &opened, &created)
	if err == sql.ErrNoRows {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	if triggerVal.Valid {
		v := triggerVal.String
		n.TriggerValue = &v
	}
	n.IsMine = authorID == user.ID
	if opened.Valid {
		s := opened.Time.UTC().Format(time.RFC3339)
		n.OpenedAt = &s
	}
	n.CreatedAt = created.UTC().Format(time.RFC3339)
	json.NewEncoder(w).Encode(n)
	broadcastServerEvent(relationshipID, "SYNC_ASYNC_NOTES", map[string]any{"relationshipId": relationshipID})
}

func handleWidgetSummary(w http.ResponseWriter, r *http.Request) {
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
	if user.RelationshipID == nil {
		http.Error(w, "not paired", http.StatusForbidden)
		return
	}
	relationshipID := *user.RelationshipID
	today := clientLocalDate(r)

	var summary WidgetSummary
	var nextVisit sql.NullTime
	_ = db.QueryRow(
		`SELECT next_visit_at FROM relationships WHERE id = $1`, relationshipID,
	).Scan(&nextVisit)
	if nextVisit.Valid {
		s := nextVisit.Time.UTC().Format(time.RFC3339)
		summary.NextVisitAt = &s
	}

	var evTitle sql.NullString
	var evAt sql.NullTime
	err = db.QueryRow(
		`SELECT title, event_at FROM shared_events
         WHERE relationship_id = $1 AND event_at >= NOW()
         ORDER BY event_at ASC LIMIT 1`,
		relationshipID,
	).Scan(&evTitle, &evAt)
	if err == nil {
		if evTitle.Valid {
			t := evTitle.String
			summary.NextEventTitle = &t
		}
		if evAt.Valid {
			s := evAt.Time.UTC().Format(time.RFC3339)
			summary.NextEventAt = &s
		}
	}

	checkIns, _ := buildTodayCheckIns(user.ID, relationshipID, today)
	summary.MineCheckedIn = checkIns.Mine != nil
	summary.PartnerCheckedIn = checkIns.Partner != nil

	streak, _ := computeConnectionStreak(relationshipID)
	summary.CurrentStreak = streak.CurrentStreak

	json.NewEncoder(w).Encode(summary)
}

func deleteRelationshipData(tx *sql.Tx, relationshipID string) error {
	tables := []string{
		`DELETE FROM async_notes WHERE relationship_id = $1`,
		`DELETE FROM itinerary_items WHERE relationship_id = $1`,
		`DELETE FROM weekly_goals WHERE relationship_id = $1`,
		`DELETE FROM shared_events WHERE relationship_id = $1`,
		`DELETE FROM daily_checkins WHERE relationship_id = $1`,
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
	broadcastServerEvent(relationshipID, "RELATIONSHIP_ENDED", map[string]any{})
}

func main() {
	initDB()
	defer db.Close()

	http.HandleFunc("/health", handlers.Health(db))
	http.HandleFunc("/ws", handleConnections)
	http.HandleFunc("/api/itinerary", handleGetItinerary)
	http.HandleFunc("/api/lists", handleGetList)
	http.HandleFunc("/api/lists/items", handleListItems)
	http.HandleFunc("/api/lists/items/", handleListItems)
	http.HandleFunc("/api/relationship", handleGetRelationship)
	http.HandleFunc("/api/relationship/visit", handlePutRelationshipVisit)
	http.HandleFunc("/api/goals/current", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			handlePostWeeklyGoal(w, r)
			return
		}
		handleGetWeeklyGoals(w, r)
	})
	http.HandleFunc("/api/goals/", handleGoalByID)
	http.HandleFunc("/api/events", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			handlePostEvent(w, r)
			return
		}
		handleGetEvents(w, r)
	})
	http.HandleFunc("/api/events/", handleEventByID)
	http.HandleFunc("/api/checkins/today", handleCheckInsToday)
	http.HandleFunc("/api/checkins/streak", handleGetStreak)
	http.HandleFunc("/api/async-notes", handleAsyncNotes)
	http.HandleFunc("/api/async-notes/", handleAsyncNoteByID)
	http.HandleFunc("/api/widget/summary", handleWidgetSummary)
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

	db.Exec(`DELETE FROM pairing_codes WHERE expires_at < NOW()`)
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

	var creatorRel sql.NullString
	if err := tx.QueryRow(
		`SELECT relationship_id::text FROM users WHERE id = $1`, creatorUserID,
	).Scan(&creatorRel); err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	if creatorRel.Valid {
		http.Error(w, "code creator already paired", http.StatusBadRequest)
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
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, X-Device-Id, X-Local-Date")
	w.Header().Set("Content-Type", "application/json")

	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return true
	}
	return false
}
