package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"

	"golang.org/x/oauth2"
	"golang.org/x/oauth2/google"
	googlecalendar "google.golang.org/api/calendar/v3"
	"google.golang.org/api/option"
)

// googleOAuthConfig builds the OAuth2 config from environment variables.
// Required: GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI
func googleOAuthConfig() *oauth2.Config {
	return &oauth2.Config{
		ClientID:     os.Getenv("GOOGLE_CLIENT_ID"),
		ClientSecret: os.Getenv("GOOGLE_CLIENT_SECRET"),
		RedirectURL:  os.Getenv("GOOGLE_REDIRECT_URI"),
		Scopes:       []string{googlecalendar.CalendarScope},
		Endpoint:     google.Endpoint,
	}
}

// googleEnabled returns false when the required env vars are absent so that
// the handlers degrade gracefully instead of panicking.
func googleEnabled() bool {
	return os.Getenv("GOOGLE_CLIENT_ID") != "" &&
		os.Getenv("GOOGLE_CLIENT_SECRET") != "" &&
		os.Getenv("GOOGLE_REDIRECT_URI") != ""
}

// ── OAuth flow ────────────────────────────────────────────────────────────────

// handleGoogleAuthURL returns the Google consent-page URL. The deviceId is
// embedded in the state parameter so the callback can find the user again.
//
//	GET /api/google/auth-url
func handleGoogleAuthURL(w http.ResponseWriter, r *http.Request) {
	if applyCORS(w, r) {
		return
	}
	if !googleEnabled() {
		http.Error(w, "Google Calendar not configured", http.StatusNotImplemented)
		return
	}
	deviceID, ok := requireDeviceID(w, r)
	if !ok {
		return
	}
	cfg := googleOAuthConfig()
	url := cfg.AuthCodeURL(
		deviceID, // state = deviceId; verified in callback
		oauth2.AccessTypeOffline,
		oauth2.ApprovalForce,
	)
	json.NewEncoder(w).Encode(map[string]string{"url": url})
}

// handleGoogleCallback is the OAuth redirect target. Google POSTs the auth
// code here. After exchanging the code for tokens we store them and redirect
// the user back into the app via a deep link.
//
//	GET /api/google/callback?code=...&state=<deviceId>
func handleGoogleCallback(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	code := r.URL.Query().Get("code")
	deviceID := r.URL.Query().Get("state")
	if code == "" || deviceID == "" {
		http.Error(w, "missing code or state", http.StatusBadRequest)
		return
	}

	cfg := googleOAuthConfig()
	token, err := cfg.Exchange(r.Context(), code)
	if err != nil {
		log.Printf("google oauth: code exchange failed: %v", err)
		http.Error(w, "token exchange failed", http.StatusBadRequest)
		return
	}

	user, err := getOrCreateUser(deviceID)
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}

	// Fetch the Google account email so we can display it in settings.
	email := googleEmailFromToken(r.Context(), cfg, token)

	if err := storeGoogleToken(user.ID, token, email); err != nil {
		log.Printf("google oauth: store token failed: %v", err)
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}

	// Redirect back into the app using the custom scheme.
	http.Redirect(w, r, "orbit://google-calendar/connected", http.StatusFound)
}

// handleGoogleStatus reports whether the requesting user has a connected Google
// account and, if so, the email address.
//
//	GET /api/google/status
func handleGoogleStatus(w http.ResponseWriter, r *http.Request) {
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

	var email string
	err = db.QueryRow(
		`SELECT COALESCE(email, '') FROM google_oauth_tokens WHERE user_id = $1`,
		user.ID,
	).Scan(&email)
	connected := err == nil
	json.NewEncoder(w).Encode(map[string]any{
		"connected": connected,
		"email":     email,
	})
}

// handleGoogleDisconnect removes the stored Google tokens.
//
//	DELETE /api/google/connect
func handleGoogleDisconnect(w http.ResponseWriter, r *http.Request) {
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
	user, err := getOrCreateUser(deviceID)
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	_, _ = db.Exec(`DELETE FROM google_oauth_tokens WHERE user_id = $1`, user.ID)
	json.NewEncoder(w).Encode(map[string]bool{"ok": true})
}

// ── Token storage helpers ─────────────────────────────────────────────────────

func storeGoogleToken(userID string, token *oauth2.Token, email string) error {
	_, err := db.Exec(
		`INSERT INTO google_oauth_tokens
           (user_id, access_token, refresh_token, expiry, email, updated_at)
         VALUES ($1, $2, $3, $4, $5, NOW())
         ON CONFLICT (user_id) DO UPDATE
           SET access_token  = EXCLUDED.access_token,
               refresh_token = COALESCE(NULLIF(EXCLUDED.refresh_token, ''), google_oauth_tokens.refresh_token),
               expiry        = EXCLUDED.expiry,
               email         = EXCLUDED.email,
               updated_at    = NOW()`,
		userID, token.AccessToken, token.RefreshToken, token.Expiry, email,
	)
	return err
}

// googleClientForUser returns an HTTP client that automatically refreshes the
// stored OAuth token. Returns nil if the user has no Google token.
func googleClientForUser(userID string) *http.Client {
	var accessToken, refreshToken string
	var expiry time.Time
	err := db.QueryRow(
		`SELECT access_token, refresh_token, expiry FROM google_oauth_tokens WHERE user_id = $1`,
		userID,
	).Scan(&accessToken, &refreshToken, &expiry)
	if err != nil {
		return nil
	}

	cfg := googleOAuthConfig()
	tok := &oauth2.Token{
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		Expiry:       expiry,
	}

	// Wrap in a token source that persists refreshed tokens back to the DB.
	ts := &persistingTokenSource{
		base:   cfg.TokenSource(context.Background(), tok),
		userID: userID,
	}
	return oauth2.NewClient(context.Background(), ts)
}

// persistingTokenSource wraps an oauth2.TokenSource and writes any new token
// back to the database after an auto-refresh.
type persistingTokenSource struct {
	base   oauth2.TokenSource
	userID string
}

func (p *persistingTokenSource) Token() (*oauth2.Token, error) {
	tok, err := p.base.Token()
	if err != nil {
		return nil, err
	}
	// Best-effort persist — don't block the caller on a DB write.
	go func() {
		if saveErr := storeGoogleToken(p.userID, tok, ""); saveErr != nil {
			log.Printf("google oauth: persisting refreshed token failed: %v", saveErr)
		}
	}()
	return tok, nil
}

// googleEmailFromToken fetches the user's email from the tokeninfo endpoint.
func googleEmailFromToken(ctx context.Context, cfg *oauth2.Config, token *oauth2.Token) string {
	client := cfg.Client(ctx, token)
	resp, err := client.Get("https://www.googleapis.com/oauth2/v3/userinfo")
	if err != nil {
		return ""
	}
	defer resp.Body.Close()
	var info struct {
		Email string `json:"email"`
	}
	_ = json.NewDecoder(resp.Body).Decode(&info)
	return info.Email
}

// ── Google Calendar helpers ───────────────────────────────────────────────────

// orbitCalendarColor is applied to the "Orbit" secondary calendar in Google.
const orbitCalendarColor = "#E91E63" // matches Orbit's accent pink

// ensureOrbitCalendar finds or creates a calendar named "Orbit" in the user's
// Google account. Returns the calendar ID.
func ensureOrbitCalendar(svc *googlecalendar.Service) (string, error) {
	list, err := svc.CalendarList.List().Do()
	if err != nil {
		return "", fmt.Errorf("listing calendars: %w", err)
	}
	for _, cal := range list.Items {
		if cal.Summary == "Orbit" {
			return cal.Id, nil
		}
	}
	// Not found — create it.
	created, err := svc.Calendars.Insert(&googlecalendar.Calendar{
		Summary:  "Orbit",
		TimeZone: "UTC",
	}).Do()
	if err != nil {
		return "", fmt.Errorf("creating Orbit calendar: %w", err)
	}
	return created.Id, nil
}

// fetchGoogleEvents pulls events from the user's primary Google Calendar for
// the given date range and returns them as SharedEvents with a "google" source
// tag so the frontend can distinguish them.
func fetchGoogleEvents(userID string, start, end time.Time) []SharedEvent {
	client := googleClientForUser(userID)
	if client == nil {
		return nil
	}
	svc, err := googlecalendar.NewService(context.Background(), option.WithHTTPClient(client))
	if err != nil {
		log.Printf("google calendar: service init failed: %v", err)
		return nil
	}
	events, err := svc.Events.List("primary").
		TimeMin(start.Format(time.RFC3339)).
		TimeMax(end.Format(time.RFC3339)).
		SingleEvents(true).
		OrderBy("startTime").
		MaxResults(250).
		Do()
	if err != nil {
		log.Printf("google calendar: events.list failed: %v", err)
		return nil
	}

	color := "#4285F4" // Google Blue
	source := "google"
	result := make([]SharedEvent, 0, len(events.Items))
	for _, item := range events.Items {
		if item.Status == "cancelled" {
			continue
		}
		ev := googleItemToSharedEvent(item, color, source)
		result = append(result, ev)
	}
	return result
}

func googleItemToSharedEvent(item *googlecalendar.Event, color, source string) SharedEvent {
	allDay := false
	var startStr, endStr string

	if item.Start.Date != "" {
		// All-day event.
		allDay = true
		startStr = item.Start.Date + "T00:00:00Z"
		endStr = item.End.Date + "T00:00:00Z"
	} else {
		startStr = item.Start.DateTime
		endStr = item.End.DateTime
	}

	ownerType := "self" // Google events always belong to "self"
	ownerLabel := source
	return SharedEvent{
		ID:         "gcal_" + item.Id,
		Title:      item.Summary,
		EventAt:    startStr,
		StartAt:    startStr,
		EndAt:      endStr,
		AllDay:     allDay,
		Color:      &color,
		OwnerType:  ownerType,
		OwnerLabel: &ownerLabel,
	}
}

// pushEventToGoogle creates the event in the user's "Orbit" calendar and
// stores the returned Google event ID on the shared_events row.
func pushEventToGoogle(userID, orbitEventID string, ev SharedEvent) {
	client := googleClientForUser(userID)
	if client == nil {
		return
	}
	svc, err := googlecalendar.NewService(context.Background(), option.WithHTTPClient(client))
	if err != nil {
		log.Printf("google calendar: push event: service init failed: %v", err)
		return
	}
	calID, err := ensureOrbitCalendar(svc)
	if err != nil {
		log.Printf("google calendar: push event: %v", err)
		return
	}

	gEvent := &googlecalendar.Event{
		Summary: ev.Title,
	}
	if ev.Description != nil {
		gEvent.Description = *ev.Description
	}
	if ev.AllDay {
		// Google all-day events use date strings (YYYY-MM-DD).
		startDate := strings.TrimSuffix(ev.StartAt, "T00:00:00Z")
		if len(startDate) > 10 {
			startDate = startDate[:10]
		}
		endDate := strings.TrimSuffix(ev.EndAt, "T00:00:00Z")
		if len(endDate) > 10 {
			endDate = endDate[:10]
		}
		gEvent.Start = &googlecalendar.EventDateTime{Date: startDate}
		gEvent.End = &googlecalendar.EventDateTime{Date: endDate}
	} else {
		gEvent.Start = &googlecalendar.EventDateTime{DateTime: ev.StartAt}
		gEvent.End = &googlecalendar.EventDateTime{DateTime: ev.EndAt}
	}

	created, err := svc.Events.Insert(calID, gEvent).Do()
	if err != nil {
		log.Printf("google calendar: push event: insert failed: %v", err)
		return
	}

	// Store the Google event ID so we can delete it later if needed.
	_, _ = db.Exec(
		`UPDATE shared_events SET google_event_id = $1 WHERE id = $2`,
		created.Id, orbitEventID,
	)
	log.Printf("google calendar: pushed event %s → Google %s", orbitEventID, created.Id)
}

// deleteEventFromGoogle removes an event from the user's Orbit calendar.
func deleteEventFromGoogle(userID, googleEventID string) {
	client := googleClientForUser(userID)
	if client == nil {
		return
	}
	svc, err := googlecalendar.NewService(context.Background(), option.WithHTTPClient(client))
	if err != nil {
		log.Printf("google calendar: delete event: service init failed: %v", err)
		return
	}
	calID, err := ensureOrbitCalendar(svc)
	if err != nil {
		log.Printf("google calendar: delete event: %v", err)
		return
	}
	if err := svc.Events.Delete(calID, googleEventID).Do(); err != nil {
		log.Printf("google calendar: delete event %s failed: %v", googleEventID, err)
	}
}
