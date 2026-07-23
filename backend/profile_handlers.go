package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"regexp"
	"strings"
	"time"
)

var hexColorRe = regexp.MustCompile(`^#[0-9A-Fa-f]{6}$`)

type UserProfileDTO struct {
	DisplayName       *string `json:"displayName,omitempty"`
	ProfilePictureUrl *string `json:"profilePictureUrl,omitempty"`
	CalendarColor     string  `json:"calendarColor"`
	StatusMessage     *string `json:"statusMessage,omitempty"`
	VenmoUsername     *string `json:"venmoUsername,omitempty"`
}

type ProfileResponse struct {
	Mine        UserProfileDTO  `json:"mine"`
	Partner     *UserProfileDTO `json:"partner,omitempty"`
	SharedColor *string         `json:"sharedColor,omitempty"`
}

func avatarObjectKey(relationshipID, userID, ext string) string {
	ext = strings.TrimPrefix(ext, ".")
	if ext == "" {
		ext = "jpg"
	}
	return "avatars/" + relationshipID + "/" + userID + "." + ext
}

func loadUserProfile(userID string) (UserProfileDTO, error) {
	var displayName, pictureKey, calendarColor, statusMessage, venmoUsername sql.NullString
	err := db.QueryRow(
		`SELECT display_name, profile_picture_url, calendar_color, status_message, venmo_username
         FROM users WHERE id::text = $1`,
		userID,
	).Scan(&displayName, &pictureKey, &calendarColor, &statusMessage, &venmoUsername)
	if err != nil {
		return UserProfileDTO{}, err
	}
	dto := UserProfileDTO{CalendarColor: "#C44B6E"}
	if calendarColor.Valid && calendarColor.String != "" {
		dto.CalendarColor = calendarColor.String
	}
	if displayName.Valid && strings.TrimSpace(displayName.String) != "" {
		n := strings.TrimSpace(displayName.String)
		dto.DisplayName = &n
	}
	if statusMessage.Valid && strings.TrimSpace(statusMessage.String) != "" {
		s := strings.TrimSpace(statusMessage.String)
		dto.StatusMessage = &s
	}
	if venmoUsername.Valid && strings.TrimSpace(venmoUsername.String) != "" {
		v := strings.TrimSpace(venmoUsername.String)
		dto.VenmoUsername = &v
	}
	if pictureKey.Valid && pictureKey.String != "" && mediaStore != nil {
		url, err := mediaStore.SignGet(context.Background(), pictureKey.String, 15*time.Minute)
		if err == nil {
			dto.ProfilePictureUrl = &url
		}
	}
	return dto, nil
}

func handleGetProfile(w http.ResponseWriter, r *http.Request) {
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
	mine, err := loadUserProfile(user.ID)
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	resp := ProfileResponse{Mine: mine}
	var partnerID string
	err = db.QueryRow(
		`SELECT id::text FROM users WHERE relationship_id = $1 AND id != $2 LIMIT 1`,
		*user.RelationshipID, user.ID,
	).Scan(&partnerID)
	if err == nil {
		if partner, err := loadUserProfile(partnerID); err == nil {
			resp.Partner = &partner
		}
	}
	var sharedColor sql.NullString
	if err := db.QueryRow(
		`SELECT shared_calendar_color FROM relationships WHERE id = $1`,
		*user.RelationshipID,
	).Scan(&sharedColor); err == nil && sharedColor.Valid && sharedColor.String != "" {
		c := sharedColor.String
		resp.SharedColor = &c
	}
	json.NewEncoder(w).Encode(resp)
}

func handlePutProfile(w http.ResponseWriter, r *http.Request) {
	if applyCORS(w, r) || r.Method != http.MethodPut {
		if r.Method != http.MethodPut {
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
		DisplayName         *string `json:"displayName"`
		CalendarColor       *string `json:"calendarColor"`
		SharedCalendarColor *string `json:"sharedCalendarColor"`
		StatusMessage       *string `json:"statusMessage"`
		VenmoUsername       *string `json:"venmoUsername"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}
	if body.DisplayName != nil {
		name := strings.TrimSpace(*body.DisplayName)
		if len(name) > 40 {
			name = name[:40]
		}
		_, err = db.Exec(`UPDATE users SET display_name = NULLIF($1,'') WHERE id = $2`, name, user.ID)
		if err != nil {
			http.Error(w, "db error", http.StatusInternalServerError)
			return
		}
	}
	if body.CalendarColor != nil {
		color := strings.TrimSpace(*body.CalendarColor)
		if !hexColorRe.MatchString(color) {
			http.Error(w, "invalid calendarColor", http.StatusBadRequest)
			return
		}
		_, err = db.Exec(`UPDATE users SET calendar_color = $1 WHERE id = $2`, color, user.ID)
		if err != nil {
			http.Error(w, "db error", http.StatusInternalServerError)
			return
		}
	}
	if body.StatusMessage != nil {
		msg := strings.TrimSpace(*body.StatusMessage)
		if len(msg) > 80 {
			msg = msg[:80]
		}
		_, err = db.Exec(
			`UPDATE users SET status_message = NULLIF($1,''), status_updated_at = NOW() WHERE id = $2`,
			msg, user.ID,
		)
		if err != nil {
			http.Error(w, "db error", http.StatusInternalServerError)
			return
		}
	}
	if body.VenmoUsername != nil {
		v := strings.TrimPrefix(strings.TrimSpace(*body.VenmoUsername), "@")
		if len(v) > 30 {
			v = v[:30]
		}
		_, err = db.Exec(`UPDATE users SET venmo_username = NULLIF($1,'') WHERE id = $2`, v, user.ID)
		if err != nil {
			http.Error(w, "db error", http.StatusInternalServerError)
			return
		}
	}
	if body.SharedCalendarColor != nil && user.RelationshipID != nil {
		color := strings.TrimSpace(*body.SharedCalendarColor)
		if !hexColorRe.MatchString(color) {
			http.Error(w, "invalid sharedCalendarColor", http.StatusBadRequest)
			return
		}
		_, err = db.Exec(
			`UPDATE relationships SET shared_calendar_color = $1 WHERE id = $2`,
			color, *user.RelationshipID,
		)
		if err != nil {
			http.Error(w, "db error", http.StatusInternalServerError)
			return
		}
	}
	if user.RelationshipID != nil {
		broadcastServerEvent(*user.RelationshipID, "SYNC_PROFILE", map[string]any{})
		broadcastServerEvent(*user.RelationshipID, "SYNC_PRESENCE", map[string]any{})
	}
	mine, _ := loadUserProfile(user.ID)
	json.NewEncoder(w).Encode(mine)
}

func handleProfileAvatarPresign(w http.ResponseWriter, r *http.Request) {
	if applyCORS(w, r) || r.Method != http.MethodPost {
		if r.Method != http.MethodPost {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
		return
	}
	if mediaStore == nil {
		http.Error(w, "storage not configured", http.StatusServiceUnavailable)
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
		ContentType string `json:"contentType"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}
	ct := strings.TrimSpace(body.ContentType)
	if ct == "" {
		ct = "image/jpeg"
	}
	ext := "jpg"
	if strings.Contains(ct, "png") {
		ext = "png"
	}
	key := avatarObjectKey(*user.RelationshipID, user.ID, ext)
	url, err := mediaStore.PresignPut(context.Background(), key, ct, 15*time.Minute)
	if err != nil {
		http.Error(w, "presign failed", http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(map[string]any{
		"uploadUrl": url,
		"objectKey": key,
		"expiresIn": 900,
	})
}

func handlePutProfileAvatar(w http.ResponseWriter, r *http.Request) {
	if applyCORS(w, r) || r.Method != http.MethodPut {
		if r.Method != http.MethodPut {
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
		ObjectKey string `json:"objectKey"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}
	key := strings.TrimSpace(body.ObjectKey)
	expectedPrefix := "avatars/" + *user.RelationshipID + "/" + user.ID + "."
	if key == "" || !strings.HasPrefix(key, expectedPrefix) {
		http.Error(w, "invalid objectKey", http.StatusBadRequest)
		return
	}
	_, err = db.Exec(`UPDATE users SET profile_picture_url = $1 WHERE id = $2`, key, user.ID)
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	if user.RelationshipID != nil {
		broadcastServerEvent(*user.RelationshipID, "SYNC_PROFILE", map[string]any{})
	}
	mine, _ := loadUserProfile(user.ID)
	json.NewEncoder(w).Encode(mine)
}

func registerProfileRoutes() {
	http.HandleFunc("/api/profile", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			handleGetProfile(w, r)
			return
		}
		if r.Method == http.MethodPut {
			handlePutProfile(w, r)
			return
		}
		if applyCORS(w, r) {
			return
		}
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	})
	http.HandleFunc("/api/profile/avatar/presign", handleProfileAvatarPresign)
	http.HandleFunc("/api/profile/avatar", handlePutProfileAvatar)
}
