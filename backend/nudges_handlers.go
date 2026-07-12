package main

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

type nudgePreset struct {
	Title string
	Body  string // %s is replaced with the sender's name
}

// Quick reminders a partner can fire off. Keep in sync with the frontend list.
var nudgePresets = map[string]nudgePreset{
	"charge_phone":    {Title: "Charge your phone 🔋", Body: "%s thinks your battery might be low."},
	"send_photo":      {Title: "Send a photo 📸", Body: "%s would love a photo of you."},
	"thinking_of_you": {Title: "Thinking of you 💭", Body: "%s is thinking about you."},
	"call_me":         {Title: "Call me 📞", Body: "%s would love a call."},
	"good_morning":    {Title: "Good morning ☀️", Body: "%s is wishing you a good morning."},
	"goodnight":       {Title: "Goodnight 🌙", Body: "%s is wishing you goodnight."},
}

func handlePushToken(w http.ResponseWriter, r *http.Request) {
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
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	var body struct {
		Token    string `json:"token"`
		Platform string `json:"platform"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil ||
		strings.TrimSpace(body.Token) == "" {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}
	platform := strings.TrimSpace(body.Platform)
	if platform == "" {
		platform = "ios"
	}
	_, err = db.Exec(
		`INSERT INTO push_tokens (user_id, token, platform, updated_at)
         VALUES ($1, $2, $3, NOW())
         ON CONFLICT (token)
         DO UPDATE SET user_id = EXCLUDED.user_id, platform = EXCLUDED.platform, updated_at = NOW()`,
		user.ID, strings.TrimSpace(body.Token), platform,
	)
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(map[string]bool{"ok": true})
}

func handleNudge(w http.ResponseWriter, r *http.Request) {
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
		Type string `json:"type"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}
	preset, ok := nudgePresets[body.Type]
	if !ok {
		http.Error(w, "unknown nudge", http.StatusBadRequest)
		return
	}

	var senderName sql.NullString
	_ = db.QueryRow(`SELECT display_name FROM users WHERE id = $1`, user.ID).Scan(&senderName)
	name := strings.TrimSpace(senderName.String)
	if name == "" {
		name = "Your partner"
	}

	var partnerID string
	err = db.QueryRow(
		`SELECT id::text FROM users WHERE relationship_id = $1 AND id != $2 LIMIT 1`,
		*user.RelationshipID, user.ID,
	).Scan(&partnerID)
	if err != nil {
		http.Error(w, "partner not found", http.StatusNotFound)
		return
	}

	title := preset.Title
	message := fmt.Sprintf(preset.Body, name)

	// In-app realtime alert (shown when the partner has the app open).
	broadcastServerEvent(*user.RelationshipID, "NUDGE", map[string]any{
		"type":     body.Type,
		"title":    title,
		"body":     message,
		"fromName": name,
	})

	// Push notification (delivered when the app is backgrounded or closed).
	if tokens := partnerPushTokens(partnerID); len(tokens) > 0 {
		go sendExpoPush(tokens, title, message, map[string]any{
			"type": body.Type,
			"kind": "nudge",
		})
	}

	json.NewEncoder(w).Encode(map[string]bool{"ok": true})
}

func partnerPushTokens(userID string) []string {
	rows, err := db.Query(`SELECT token FROM push_tokens WHERE user_id::text = $1`, userID)
	if err != nil {
		return nil
	}
	defer rows.Close()
	var tokens []string
	for rows.Next() {
		var t string
		if rows.Scan(&t) == nil && strings.TrimSpace(t) != "" {
			tokens = append(tokens, t)
		}
	}
	return tokens
}

type expoPushMessage struct {
	To    string         `json:"to"`
	Title string         `json:"title"`
	Body  string         `json:"body"`
	Sound string         `json:"sound"`
	Data  map[string]any `json:"data,omitempty"`
}

// sendExpoPush delivers notifications through Expo's push service. Best-effort:
// failures are ignored since nudges also arrive in-app over the websocket.
func sendExpoPush(tokens []string, title, body string, data map[string]any) {
	msgs := make([]expoPushMessage, 0, len(tokens))
	for _, t := range tokens {
		msgs = append(msgs, expoPushMessage{
			To:    t,
			Title: title,
			Body:  body,
			Sound: "default",
			Data:  data,
		})
	}
	payload, err := json.Marshal(msgs)
	if err != nil {
		return
	}
	req, err := http.NewRequest(
		http.MethodPost,
		"https://exp.host/--/api/v2/push/send",
		bytes.NewReader(payload),
	)
	if err != nil {
		return
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	client := &http.Client{Timeout: 10 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return
	}
	_ = resp.Body.Close()
}
