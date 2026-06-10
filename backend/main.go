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
	ID             string  `json:"id"`
	Title          string  `json:"title"`
	EventAt        string  `json:"eventAt"`
	StartAt        string  `json:"startAt"`
	EndAt          string  `json:"endAt"`
	AllDay         bool    `json:"allDay"`
	CreatedBy      *string `json:"createdBy,omitempty"`
	Description    *string `json:"description,omitempty"`
	RecurrenceRule *string `json:"recurrenceRule,omitempty"`
	Color          *string `json:"color,omitempty"`
	OwnerLabel     *string `json:"ownerLabel,omitempty"`
	OwnerType      string  `json:"ownerType,omitempty"`
}

type AsyncNote struct {
	ID           string  `json:"id"`
	TriggerType  string  `json:"triggerType"`
	TriggerValue *string `json:"triggerValue,omitempty"`
	LockType     string  `json:"lockType"`
	OpensAt      *string `json:"opensAt,omitempty"`
	Body         *string `json:"body"`
	IsLocked     bool    `json:"isLocked"`
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

	user, err := getOrCreateUser(deviceID)
	if err != nil {
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
		if gameManager != nil {
			gameManager.Leave(ws)
		}
		hub.Unregister(ws)
		ws.Close()
	}()

	for {
		_, message, err := ws.ReadMessage()
		if err != nil {
			break
		}
		processIncomingPayload(message, relationshipID, user.ID, ws)
	}
}

func normalizeListType(listType string) (string, bool) {
	switch listType {
	case "reunion":
		return "reunion", true
	case "visit":
		return "visit", true
	default:
		return "", false
	}
}

func processIncomingPayload(rawMessage []byte, relationshipID, userID string, conn *websocket.Conn) {
	var envelope MessageEnvelope
	if err := json.Unmarshal(rawMessage, &envelope); err != nil {
		return
	}

	switch envelope.Action {
	case "GAME_JOIN":
		if gameManager != nil {
			gameManager.HandleWSJoin(conn, relationshipID, userID, envelope.Payload)
		}
	case "GAME_MOVE":
		if gameManager != nil {
			gameManager.HandleWSMove(conn, relationshipID, userID, envelope.Payload)
		}
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

	listType, ok := normalizeListType(r.URL.Query().Get("type"))
	if !ok {
		http.Error(w, "invalid list type", http.StatusBadRequest)
		return
	}
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
	listType, ok := normalizeListType(item.ListType)
	if !ok {
		return fmt.Errorf("invalid list type")
	}
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
	normalized, ok := normalizeListType(listType)
	if !ok {
		return fmt.Errorf("invalid list type")
	}
	listType = normalized
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
	listType, ok := normalizeListType(item.ListType)
	if !ok {
		http.Error(w, "invalid list type", http.StatusBadRequest)
		return
	}
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
	listType, okType := normalizeListType(r.URL.Query().Get("type"))
	if !okType {
		http.Error(w, "invalid list type", http.StatusBadRequest)
		return
	}
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
	case http.MethodPut, http.MethodPatch:
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

const sharedEventSelect = `id, title, start_at, end_at, all_day, created_by::text, description, recurrence_rule, color, owner_label, owner_type, event_at`

func normalizeOwnerType(raw string) string {
	switch strings.TrimSpace(strings.ToLower(raw)) {
	case "self", "partner", "shared":
		return strings.TrimSpace(strings.ToLower(raw))
	default:
		return "shared"
	}
}

func finishSharedEvent(ev *SharedEvent, startAt, endAt time.Time, allDay bool, createdBy, description, recurrenceRule, color, owner, ownerType sql.NullString) {
	ev.StartAt = startAt.UTC().Format(time.RFC3339)
	ev.EndAt = endAt.UTC().Format(time.RFC3339)
	ev.EventAt = ev.StartAt
	ev.AllDay = allDay
	if createdBy.Valid {
		s := createdBy.String
		ev.CreatedBy = &s
	}
	if description.Valid {
		s := description.String
		ev.Description = &s
	}
	if recurrenceRule.Valid {
		s := recurrenceRule.String
		ev.RecurrenceRule = &s
	}
	if color.Valid {
		s := color.String
		ev.Color = &s
	}
	if owner.Valid {
		s := owner.String
		ev.OwnerLabel = &s
	}
	if ownerType.Valid {
		ev.OwnerType = normalizeOwnerType(ownerType.String)
	} else {
		ev.OwnerType = "shared"
	}
}

func scanSharedEventRow(rows *sql.Rows) (SharedEvent, error) {
	var ev SharedEvent
	var startAt, endAt, legacyAt time.Time
	var allDay bool
	var createdBy, description, recurrenceRule, color, owner, ownerType sql.NullString
	if err := rows.Scan(
		&ev.ID, &ev.Title, &startAt, &endAt, &allDay,
		&createdBy, &description, &recurrenceRule, &color, &owner, &ownerType, &legacyAt,
	); err != nil {
		return ev, err
	}
	if startAt.IsZero() && !legacyAt.IsZero() {
		startAt = legacyAt
	}
	if endAt.IsZero() {
		endAt = startAt
	}
	finishSharedEvent(&ev, startAt, endAt, allDay, createdBy, description, recurrenceRule, color, owner, ownerType)
	return ev, nil
}

func querySharedEvent(relationshipID, eventID string) (SharedEvent, error) {
	var ev SharedEvent
	var startAt, endAt, legacyAt time.Time
	var allDay bool
	var createdBy, description, recurrenceRule, color, owner, ownerType sql.NullString
	err := db.QueryRow(
		`SELECT `+sharedEventSelect+` FROM shared_events WHERE id = $1 AND relationship_id = $2`,
		eventID, relationshipID,
	).Scan(
		&ev.ID, &ev.Title, &startAt, &endAt, &allDay,
		&createdBy, &description, &recurrenceRule, &color, &owner, &ownerType, &legacyAt,
	)
	if err != nil {
		return ev, err
	}
	if startAt.IsZero() && !legacyAt.IsZero() {
		startAt = legacyAt
	}
	if endAt.IsZero() {
		endAt = startAt
	}
	finishSharedEvent(&ev, startAt, endAt, allDay, createdBy, description, recurrenceRule, color, owner, ownerType)
	return ev, nil
}

func parseDateParam(s string) (time.Time, error) {
	s = strings.TrimSpace(s)
	if s == "" {
		return time.Time{}, fmt.Errorf("empty date")
	}
	if t, err := time.Parse("2006-01-02", s); err == nil {
		return t.UTC(), nil
	}
	return time.Parse(time.RFC3339, s)
}

func eventRangeFromRequest(r *http.Request) (time.Time, time.Time, bool, error) {
	startParam := strings.TrimSpace(r.URL.Query().Get("start"))
	endParam := strings.TrimSpace(r.URL.Query().Get("end"))
	if startParam != "" && endParam != "" {
		start, err := parseDateParam(startParam)
		if err != nil {
			return time.Time{}, time.Time{}, false, err
		}
		endDay, err := parseDateParam(endParam)
		if err != nil {
			return time.Time{}, time.Time{}, false, err
		}
		end := endDay.Add(24*time.Hour - time.Nanosecond)
		return start, end, true, nil
	}
	return time.Time{}, time.Time{}, false, nil
}

func resolveEventTimes(ev SharedEvent) (time.Time, time.Time, bool, error) {
	startRaw := strings.TrimSpace(ev.StartAt)
	if startRaw == "" {
		startRaw = strings.TrimSpace(ev.EventAt)
	}
	if startRaw == "" {
		return time.Time{}, time.Time{}, false, fmt.Errorf("startAt required")
	}
	start, err := time.Parse(time.RFC3339, startRaw)
	if err != nil {
		return time.Time{}, time.Time{}, false, fmt.Errorf("invalid startAt")
	}
	endRaw := strings.TrimSpace(ev.EndAt)
	var end time.Time
	if endRaw == "" {
		end = start
	} else {
		end, err = time.Parse(time.RFC3339, endRaw)
		if err != nil {
			return time.Time{}, time.Time{}, false, fmt.Errorf("invalid endAt")
		}
	}
	if end.Before(start) {
		return time.Time{}, time.Time{}, false, fmt.Errorf("endAt before startAt")
	}
	if ev.AllDay {
		su := start.UTC()
		eu := end.UTC()
		start = time.Date(su.Year(), su.Month(), su.Day(), 12, 0, 0, 0, time.UTC)
		end = time.Date(eu.Year(), eu.Month(), eu.Day(), 12, 0, 0, 0, time.UTC)
	}
	return start, end, ev.AllDay, nil
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

	rangeStart, rangeEnd, hasRange, err := eventRangeFromRequest(r)
	if err != nil {
		http.Error(w, "invalid date range", http.StatusBadRequest)
		return
	}

	var rows *sql.Rows
	if hasRange {
		rows, err = db.Query(
			`SELECT `+sharedEventSelect+` FROM shared_events
             WHERE relationship_id = $1 AND start_at <= $3 AND end_at >= $2
             ORDER BY start_at ASC`,
			relationshipID, rangeStart, rangeEnd,
		)
	} else {
		rows, err = db.Query(
			`SELECT `+sharedEventSelect+` FROM shared_events
             WHERE relationship_id = $1 ORDER BY start_at ASC`,
			relationshipID,
		)
	}
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	events := []SharedEvent{}
	for rows.Next() {
		ev, scanErr := scanSharedEventRow(rows)
		if scanErr == nil {
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
	user, err := getOrCreateUser(deviceID)
	if err != nil || user.RelationshipID == nil {
		if err == nil {
			http.Error(w, "not paired", http.StatusForbidden)
			return
		}
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	relationshipID := *user.RelationshipID

	var ev SharedEvent
	if err := json.NewDecoder(r.Body).Decode(&ev); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}
	if strings.TrimSpace(ev.Title) == "" || strings.TrimSpace(ev.ID) == "" {
		http.Error(w, "id and title required", http.StatusBadRequest)
		return
	}
	start, end, allDay, err := resolveEventTimes(ev)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	var owner, description, recurrenceRule, color interface{}
	if ev.OwnerLabel != nil {
		owner = *ev.OwnerLabel
	}
	if ev.Description != nil {
		description = *ev.Description
	}
	if ev.RecurrenceRule != nil {
		recurrenceRule = *ev.RecurrenceRule
	}
	if ev.Color != nil {
		color = *ev.Color
	}
	ownerType := normalizeOwnerType(ev.OwnerType)
	_, err = db.Exec(
		`INSERT INTO shared_events (
            id, relationship_id, title, event_at, start_at, end_at, all_day,
            created_by, description, recurrence_rule, color, owner_label, owner_type
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
		ev.ID, relationshipID, ev.Title, start, start, end, allDay,
		user.ID, description, recurrenceRule, color, owner, ownerType,
	)
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	created, err := querySharedEvent(relationshipID, ev.ID)
	if err != nil {
		w.WriteHeader(http.StatusCreated)
		ev.StartAt = start.UTC().Format(time.RFC3339)
		ev.EndAt = end.UTC().Format(time.RFC3339)
		ev.EventAt = ev.StartAt
		ev.AllDay = allDay
		ev.CreatedBy = &user.ID
		ev.OwnerType = ownerType
		json.NewEncoder(w).Encode(ev)
	} else {
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(created)
	}
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
	switch r.Method {
	case http.MethodDelete:
		handleDeleteEvent(w, r)
	case http.MethodPatch:
		handlePatchEvent(w, r)
	default:
		handleGetEvent(w, r)
	}
}

func handlePatchEvent(w http.ResponseWriter, r *http.Request) {
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

	existing, err := querySharedEvent(relationshipID, eventID)
	if err == sql.ErrNoRows {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}

	var patch SharedEvent
	if err := json.NewDecoder(r.Body).Decode(&patch); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}
	if strings.TrimSpace(patch.Title) != "" {
		existing.Title = strings.TrimSpace(patch.Title)
	}
	if patch.StartAt != "" || patch.EventAt != "" {
		if patch.EndAt == "" {
			patch.EndAt = existing.EndAt
		}
		start, end, allDay, timeErr := resolveEventTimes(patch)
		if timeErr != nil {
			http.Error(w, timeErr.Error(), http.StatusBadRequest)
			return
		}
		existing.StartAt = start.UTC().Format(time.RFC3339)
		existing.EndAt = end.UTC().Format(time.RFC3339)
		existing.EventAt = existing.StartAt
		existing.AllDay = allDay
	} else if patch.EndAt != "" {
		end, timeErr := time.Parse(time.RFC3339, patch.EndAt)
		if timeErr != nil {
			http.Error(w, "invalid endAt", http.StatusBadRequest)
			return
		}
		start, _, _, _ := resolveEventTimes(existing)
		if end.Before(start) {
			http.Error(w, "endAt before startAt", http.StatusBadRequest)
			return
		}
		existing.EndAt = end.UTC().Format(time.RFC3339)
	}
	if patch.OwnerLabel != nil {
		existing.OwnerLabel = patch.OwnerLabel
	}
	if patch.OwnerType != "" {
		existing.OwnerType = normalizeOwnerType(patch.OwnerType)
	}
	if patch.Description != nil {
		existing.Description = patch.Description
	}
	if patch.RecurrenceRule != nil {
		existing.RecurrenceRule = patch.RecurrenceRule
	}
	if patch.Color != nil {
		existing.Color = patch.Color
	}

	start, end, allDay, err := resolveEventTimes(existing)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	var owner, description, recurrenceRule, color interface{}
	if existing.OwnerLabel != nil {
		owner = *existing.OwnerLabel
	}
	if existing.Description != nil {
		description = *existing.Description
	}
	if existing.RecurrenceRule != nil {
		recurrenceRule = *existing.RecurrenceRule
	}
	if existing.Color != nil {
		color = *existing.Color
	}
	ownerType := normalizeOwnerType(existing.OwnerType)
	_, err = db.Exec(
		`UPDATE shared_events SET title = $1, event_at = $2, start_at = $3, end_at = $4,
            all_day = $5, description = $6, recurrence_rule = $7, color = $8, owner_label = $9, owner_type = $10
         WHERE id = $11 AND relationship_id = $12`,
		existing.Title, start, start, end, allDay,
		description, recurrenceRule, color, owner, ownerType, eventID, relationshipID,
	)
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	updated, _ := querySharedEvent(relationshipID, eventID)
	json.NewEncoder(w).Encode(updated)
	broadcastServerEvent(relationshipID, "SYNC_EVENTS", map[string]any{"relationshipId": relationshipID})
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

	ev, err := querySharedEvent(relationshipID, eventID)
	if err == sql.ErrNoRows {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
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

func dateStringFromCheckDate(t time.Time) string {
	return t.Format("2006-01-02")
}

func previousDateString(dateStr string) (string, error) {
	t, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return "", err
	}
	return t.AddDate(0, 0, -1).Format("2006-01-02"), nil
}

func asyncNoteUnlocked(lockType string, opensAt sql.NullTime, opened sql.NullTime, now time.Time) bool {
	if opened.Valid {
		return true
	}
	if lockType == "time" {
		if !opensAt.Valid {
			return false
		}
		return !now.Before(opensAt.Time)
	}
	// state / legacy
	return false
}

func presentAsyncNote(
	id, triggerType string,
	triggerVal sql.NullString,
	lockType string,
	opensAt, opened, created sql.NullTime,
	body string,
	authorID, viewerID string,
	now time.Time,
) AsyncNote {
	n := AsyncNote{
		ID:          id,
		TriggerType: triggerType,
		LockType:    lockType,
		IsMine:      authorID == viewerID,
	}
	if created.Valid {
		n.CreatedAt = created.Time.UTC().Format(time.RFC3339)
	}
	if lockType == "" {
		n.LockType = "state"
	}
	if triggerVal.Valid {
		v := triggerVal.String
		n.TriggerValue = &v
	}
	if opensAt.Valid {
		s := opensAt.Time.UTC().Format(time.RFC3339)
		n.OpensAt = &s
	}
	if opened.Valid {
		s := opened.Time.UTC().Format(time.RFC3339)
		n.OpenedAt = &s
	}
	unlocked := asyncNoteUnlocked(n.LockType, opensAt, opened, now)
	if n.IsMine || unlocked {
		n.Body = &body
		n.IsLocked = false
	} else {
		n.Body = nil
		n.IsLocked = true
	}
	return n
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
			`SELECT id::text, trigger_type, trigger_value, lock_type, opens_at, body,
                    author_user_id::text, opened_at, created_at
             FROM async_notes WHERE relationship_id = $1 ORDER BY created_at DESC`,
			relationshipID,
		)
		if err != nil {
			http.Error(w, "db error", http.StatusInternalServerError)
			return
		}
		defer rows.Close()
		now := time.Now().UTC()
		notes := []AsyncNote{}
		for rows.Next() {
			var id, triggerType, body, authorID string
			var lockType string
			var triggerVal sql.NullString
			var opensAt, opened, created sql.NullTime
			if err := rows.Scan(&id, &triggerType, &triggerVal, &lockType, &opensAt, &body, &authorID, &opened, &created); err != nil {
				continue
			}
			notes = append(notes, presentAsyncNote(
				id, triggerType, triggerVal, lockType, opensAt, opened, created,
				body, authorID, user.ID, now,
			))
		}
		json.NewEncoder(w).Encode(notes)

	case http.MethodPost:
		var body struct {
			TriggerType  string  `json:"triggerType"`
			TriggerValue *string `json:"triggerValue"`
			LockType     string  `json:"lockType"`
			OpensAt      *string `json:"opensAt"`
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
		lockType := strings.TrimSpace(body.LockType)
		if lockType == "" {
			lockType = "state"
		}
		if lockType != "state" && lockType != "time" {
			http.Error(w, "invalid lockType", http.StatusBadRequest)
			return
		}
		triggerType := strings.TrimSpace(body.TriggerType)
		if lockType == "time" {
			triggerType = "time"
		} else if triggerType == "" {
			triggerType = "anytime"
		}
		var opensAt interface{}
		if lockType == "time" {
			if body.OpensAt == nil || strings.TrimSpace(*body.OpensAt) == "" {
				http.Error(w, "opensAt required for time lock", http.StatusBadRequest)
				return
			}
			t, err := time.Parse(time.RFC3339, strings.TrimSpace(*body.OpensAt))
			if err != nil {
				http.Error(w, "invalid opensAt", http.StatusBadRequest)
				return
			}
			if !t.After(time.Now().UTC()) {
				http.Error(w, "opensAt must be in the future", http.StatusBadRequest)
				return
			}
			opensAt = t.UTC()
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
		var id, noteBody string
		var noteLockType string
		var tv sql.NullString
		var opensAtNull, openedNull sql.NullTime
		var created time.Time
		err := db.QueryRow(
			`INSERT INTO async_notes (relationship_id, author_user_id, trigger_type, trigger_value, lock_type, opens_at, body)
             VALUES ($1, $2, $3, $4, $5, $6, $7)
             RETURNING id::text, trigger_type, trigger_value, lock_type, opens_at, body, opened_at, created_at`,
			relationshipID, user.ID, triggerType, triggerVal, lockType, opensAt, text,
		).Scan(&id, &triggerType, &tv, &noteLockType, &opensAtNull, &noteBody, &openedNull, &created)
		if err != nil {
			http.Error(w, "db error", http.StatusInternalServerError)
			return
		}
		n := presentAsyncNote(
			id, triggerType, tv, noteLockType, opensAtNull, openedNull,
			sql.NullTime{Time: created, Valid: true},
			noteBody, user.ID, user.ID, time.Now().UTC(),
		)
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

	var id, triggerType, noteBody, authorID string
	var lockType string
	var triggerVal sql.NullString
	var opensAt, opened, createdAt sql.NullTime
	err = db.QueryRow(
		`SELECT id::text, trigger_type, trigger_value, lock_type, opens_at, body,
                author_user_id::text, opened_at, created_at
         FROM async_notes
         WHERE id::text = $1 AND relationship_id = $2 AND author_user_id != $3`,
		noteID, relationshipID, user.ID,
	).Scan(&id, &triggerType, &triggerVal, &lockType, &opensAt, &noteBody, &authorID, &opened, &createdAt)
	if err == sql.ErrNoRows {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	now := time.Now().UTC()
	if lockType == "" {
		lockType = "state"
	}
	if lockType == "time" && !asyncNoteUnlocked(lockType, opensAt, opened, now) {
		http.Error(w, "not yet available", http.StatusForbidden)
		return
	}
	err = db.QueryRow(
		`UPDATE async_notes SET opened_at = COALESCE(opened_at, NOW())
         WHERE id::text = $1 AND relationship_id = $2
         RETURNING opened_at`,
		noteID, relationshipID,
	).Scan(&opened)
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	n := presentAsyncNote(
		id, triggerType, triggerVal, lockType, opensAt, opened, createdAt,
		noteBody, authorID, user.ID, now,
	)
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
		`SELECT title, start_at FROM shared_events
         WHERE relationship_id = $1 AND start_at >= NOW()
         ORDER BY start_at ASC LIMIT 1`,
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

	_, _, bothPhotos := computePhotoStreak(relationshipID, today)
	rows, _ := db.Query(
		`SELECT user_id::text FROM daily_photos WHERE relationship_id = $1 AND photo_date = $2::date`,
		relationshipID, today,
	)
	if rows != nil {
		defer rows.Close()
		for rows.Next() {
			var uid string
			if rows.Scan(&uid) == nil {
				if uid == user.ID {
					summary.MineCheckedIn = true
				} else {
					summary.PartnerCheckedIn = true
				}
			}
		}
	}
	_ = bothPhotos
	current, _, _ := computePhotoStreak(relationshipID, today)
	summary.CurrentStreak = current

	json.NewEncoder(w).Encode(summary)
}

func deleteRelationshipData(tx *sql.Tx, relationshipID string) error {
	tables := []string{
		`DELETE FROM trivia_rounds WHERE game_id IN (SELECT id FROM trivia_games WHERE relationship_id = $1)`,
		`DELETE FROM trivia_games WHERE relationship_id = $1`,
		`DELETE FROM daily_photos WHERE relationship_id = $1`,
		`DELETE FROM photo_streak_meta WHERE relationship_id = $1`,
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
	initMediaStore()
	initGameManager()
	registerFeatureRoutes()
	registerGridGameRoutes()

	http.HandleFunc("/health", handlers.Health(db))
	http.HandleFunc("/ws", handleConnections)
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
