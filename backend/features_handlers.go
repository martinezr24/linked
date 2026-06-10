package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/martinezr24/linked-backend/internal/storage"
)

var mediaStore *storage.Client

func initMediaStore() {
	c, err := storage.NewFromEnv()
	if err != nil {
		log.Printf("media storage init failed: %v (photo uploads disabled)", err)
		return
	}
	mediaStore = c
	if c.UsesS3() {
		log.Println("photo storage: S3")
	} else {
		log.Println("photo storage: local files")
	}
}

type PartnerPresence struct {
	Timezone          string  `json:"timezone"`
	WeatherCity       *string `json:"weatherCity,omitempty"`
	LocalTime         string  `json:"localTime"`
	WeatherSummary    *string `json:"weatherSummary,omitempty"`
	TemperatureF      *int    `json:"temperatureF,omitempty"`
	DisplayName       *string `json:"displayName,omitempty"`
	ProfilePictureUrl *string `json:"profilePictureUrl,omitempty"`
	BatteryPercent    *int    `json:"batteryPercent,omitempty"`
	StatusMessage     *string `json:"statusMessage,omitempty"`
	StatusUpdatedAt   *string `json:"statusUpdatedAt,omitempty"`
}

type DailyPhotoDTO struct {
	ID        string  `json:"id"`
	PhotoDate string  `json:"photoDate"`
	Caption   *string `json:"caption,omitempty"`
	ImageURL  string  `json:"imageUrl"`
	IsMine    bool    `json:"isMine"`
	CreatedAt string  `json:"createdAt"`
}

type PhotoPostResponse struct {
	DailyPhotoDTO
	CurrentStreak int  `json:"currentStreak"`
	LongestStreak int  `json:"longestStreak"`
	BothSentToday bool `json:"bothSentToday"`
}

type PhotoTodayResponse struct {
	Mine          *DailyPhotoDTO `json:"mine"`
	Partner       *DailyPhotoDTO `json:"partner"`
	CurrentStreak int            `json:"currentStreak"`
	LongestStreak int            `json:"longestStreak"`
	BothSentToday bool           `json:"bothSentToday"`
}

type PhotoDayGroup struct {
	PhotoDate string          `json:"photoDate"`
	Mine      *DailyPhotoDTO  `json:"mine"`
	Partner   *DailyPhotoDTO  `json:"partner"`
	BothSent  bool            `json:"bothSent"`
}

func handlePutProfilePresence(w http.ResponseWriter, r *http.Request) {
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
		Timezone       string   `json:"timezone"`
		WeatherCity    *string  `json:"weatherCity"`
		WeatherLat     *float64 `json:"weatherLat"`
		WeatherLon     *float64 `json:"weatherLon"`
		BatteryPercent *int     `json:"batteryPercent"`
		StatusMessage  *string  `json:"statusMessage"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}
	tz := strings.TrimSpace(body.Timezone)
	if tz == "" {
		http.Error(w, "timezone required", http.StatusBadRequest)
		return
	}
	lat, lon := body.WeatherLat, body.WeatherLon
	if (lat == nil || lon == nil) && body.WeatherCity != nil {
		if gLat, gLon, ok := geocodeCity(strings.TrimSpace(*body.WeatherCity)); ok {
			lat, lon = &gLat, &gLon
		}
	}
	battery := body.BatteryPercent
	if battery != nil && (*battery < 0 || *battery > 100) {
		http.Error(w, "invalid batteryPercent", http.StatusBadRequest)
		return
	}
	statusMsg := body.StatusMessage
	if statusMsg != nil {
		s := strings.TrimSpace(*statusMsg)
		if len(s) > 80 {
			s = s[:80]
		}
		statusMsg = &s
	}
	_, err = db.Exec(
		`UPDATE users SET timezone = $1, weather_city = $2, weather_lat = $3, weather_lon = $4,
         battery_percent = $5,
         status_message = COALESCE($6, status_message),
         status_updated_at = CASE WHEN $6 IS NOT NULL THEN NOW() ELSE status_updated_at END,
         last_presence_at = NOW()
         WHERE id = $7`,
		tz, body.WeatherCity, lat, lon, battery, statusMsg, user.ID,
	)
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	if user.RelationshipID != nil {
		broadcastServerEvent(*user.RelationshipID, "SYNC_PRESENCE", map[string]any{})
	}
	json.NewEncoder(w).Encode(map[string]bool{"ok": true})
}

func handleGetPartnerPresence(w http.ResponseWriter, r *http.Request) {
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
	var partnerID string
	var tz sql.NullString
	var city sql.NullString
	var displayName sql.NullString
	var pictureKey sql.NullString
	var battery sql.NullInt64
	var statusMsg sql.NullString
	var statusUpdated sql.NullTime
	err = db.QueryRow(
		`SELECT id::text, timezone, weather_city, display_name, profile_picture_url,
                battery_percent, status_message, status_updated_at
         FROM users WHERE relationship_id = $1 AND id != $2 LIMIT 1`,
		*user.RelationshipID, user.ID,
	).Scan(&partnerID, &tz, &city, &displayName, &pictureKey, &battery, &statusMsg, &statusUpdated)
	if err != nil {
		http.Error(w, "partner not found", http.StatusNotFound)
		return
	}
	resp := PartnerPresence{LocalTime: formatPartnerLocalTime(tz.String)}
	if tz.Valid {
		resp.Timezone = tz.String
	}
	if city.Valid {
		c := city.String
		resp.WeatherCity = &c
	}
	if displayName.Valid && strings.TrimSpace(displayName.String) != "" {
		n := strings.TrimSpace(displayName.String)
		resp.DisplayName = &n
	}
	if pictureKey.Valid && pictureKey.String != "" && mediaStore != nil {
		if url, err := mediaStore.SignGet(context.Background(), pictureKey.String, 15*time.Minute); err == nil {
			resp.ProfilePictureUrl = &url
		}
	}
	if battery.Valid {
		b := int(battery.Int64)
		resp.BatteryPercent = &b
	}
	if statusMsg.Valid && strings.TrimSpace(statusMsg.String) != "" {
		s := strings.TrimSpace(statusMsg.String)
		resp.StatusMessage = &s
	}
	if statusUpdated.Valid {
		t := statusUpdated.Time.UTC().Format(time.RFC3339)
		resp.StatusUpdatedAt = &t
	}
	if summary, temp := fetchPartnerWeather(partnerID); summary != "" {
		resp.WeatherSummary = &summary
		resp.TemperatureF = temp
	}
	json.NewEncoder(w).Encode(resp)
}

func formatPartnerLocalTime(tz string) string {
	if tz == "" {
		return time.Now().Format("3:04 PM")
	}
	loc, err := time.LoadLocation(tz)
	if err != nil {
		return time.Now().Format("3:04 PM")
	}
	return time.Now().In(loc).Format("3:04 PM")
}

func fetchPartnerWeather(userID string) (string, *int) {
	var lat, lon sql.NullFloat64
	var city sql.NullString
	_ = db.QueryRow(
		`SELECT weather_lat, weather_lon, weather_city FROM users WHERE id::text = $1`, userID,
	).Scan(&lat, &lon, &city)
	if lat.Valid && lon.Valid {
		return fetchOpenMeteo(lat.Float64, lon.Float64)
	}
	if city.Valid && strings.TrimSpace(city.String) != "" {
		if gLat, gLon, ok := geocodeCity(strings.TrimSpace(city.String)); ok {
			_, _ = db.Exec(
				`UPDATE users SET weather_lat = $1, weather_lon = $2 WHERE id::text = $3`,
				gLat, gLon, userID,
			)
			return fetchOpenMeteo(gLat, gLon)
		}
	}
	return "", nil
}

func geocodeCity(name string) (float64, float64, bool) {
	if name == "" {
		return 0, 0, false
	}
	u := fmt.Sprintf(
		"https://geocoding-api.open-meteo.com/v1/search?name=%s&count=1&language=en&format=json",
		url.QueryEscape(name),
	)
	client := &http.Client{Timeout: 6 * time.Second}
	res, err := client.Get(u)
	if err != nil {
		return 0, 0, false
	}
	defer res.Body.Close()
	var data struct {
		Results []struct {
			Latitude  float64 `json:"latitude"`
			Longitude float64 `json:"longitude"`
		} `json:"results"`
	}
	if json.NewDecoder(res.Body).Decode(&data) != nil || len(data.Results) == 0 {
		return 0, 0, false
	}
	return data.Results[0].Latitude, data.Results[0].Longitude, true
}

func fetchOpenMeteo(lat, lon float64) (string, *int) {
	url := fmt.Sprintf(
		"https://api.open-meteo.com/v1/forecast?latitude=%f&longitude=%f&current=temperature_2m,weather_code&temperature_unit=fahrenheit",
		lat, lon,
	)
	client := &http.Client{Timeout: 5 * time.Second}
	res, err := client.Get(url)
	if err != nil {
		return "", nil
	}
	defer res.Body.Close()
	var data struct {
		Current struct {
			Temperature float64 `json:"temperature_2m"`
			WeatherCode int     `json:"weather_code"`
		} `json:"current"`
	}
	if json.NewDecoder(res.Body).Decode(&data) != nil {
		return "", nil
	}
	t := int(data.Current.Temperature)
	summary := weatherCodeLabel(data.Current.WeatherCode)
	return summary, &t
}

func weatherCodeLabel(code int) string {
	switch {
	case code == 0:
		return "Clear"
	case code <= 3:
		return "Cloudy"
	case code <= 67:
		return "Rainy"
	case code <= 77:
		return "Snowy"
	default:
		return "Stormy"
	}
}

func computePhotoStreak(relationshipID, today string) (current, longest int, bothToday bool) {
	rows, err := db.Query(
		`SELECT photo_date::text, COUNT(DISTINCT user_id) AS c
         FROM daily_photos WHERE relationship_id = $1
         GROUP BY photo_date ORDER BY photo_date ASC`,
		relationshipID,
	)
	if err != nil {
		return 0, 0, false
	}
	defer rows.Close()
	bothDays := map[string]bool{}
	var dates []string
	for rows.Next() {
		var d string
		var c int
		if rows.Scan(&d, &c) != nil || c < 2 {
			continue
		}
		bothDays[d] = true
		dates = append(dates, d)
	}
	bothToday = bothDays[today]
	expected := today
	for bothDays[expected] {
		current++
		prev, err := previousDateString(expected)
		if err != nil {
			break
		}
		expected = prev
	}
	longest = 0
	if len(dates) > 0 {
		run := 1
		longest = 1
		for i := 1; i < len(dates); i++ {
			prev, e1 := time.Parse("2006-01-02", dates[i-1])
			curr, e2 := time.Parse("2006-01-02", dates[i])
			if e1 != nil || e2 != nil {
				run = 1
				continue
			}
			if curr.Equal(prev.AddDate(0, 0, 1)) {
				run++
			} else {
				run = 1
			}
			if run > longest {
				longest = run
			}
		}
	}
	var stored int
	_ = db.QueryRow(
		`SELECT longest_streak FROM photo_streak_meta WHERE relationship_id = $1`, relationshipID,
	).Scan(&stored)
	if current > stored {
		_, _ = db.Exec(
			`INSERT INTO photo_streak_meta (relationship_id, longest_streak) VALUES ($1, $2)
             ON CONFLICT (relationship_id) DO UPDATE SET longest_streak = EXCLUDED.longest_streak`,
			relationshipID, current,
		)
		longest = max(longest, current)
	} else if stored > longest {
		longest = stored
	}
	return current, longest, bothToday
}

func photoToDTO(
	id, photoDate, objectKey, caption, authorID, viewerID string,
	created time.Time,
) (DailyPhotoDTO, error) {
	if mediaStore == nil {
		return DailyPhotoDTO{}, errors.New("storage unavailable")
	}
	url, err := mediaStore.SignGet(context.Background(), objectKey, 15*time.Minute)
	if err != nil {
		return DailyPhotoDTO{}, err
	}
	var capPtr *string
	if caption != "" {
		capPtr = &caption
	}
	return DailyPhotoDTO{
		ID:        id,
		PhotoDate: photoDate,
		Caption:   capPtr,
		ImageURL:  url,
		IsMine:    authorID == viewerID,
		CreatedAt: created.UTC().Format(time.RFC3339),
	}, nil
}

func handlePhotosPresign(w http.ResponseWriter, r *http.Request) {
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
		PhotoDate   string `json:"photoDate"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}
	photoDate := strings.TrimSpace(body.PhotoDate)
	if photoDate == "" {
		photoDate = clientLocalDate(r)
	}
	ct := strings.TrimSpace(body.ContentType)
	if ct == "" {
		ct = "image/jpeg"
	}
	ext := "jpg"
	if strings.Contains(ct, "png") {
		ext = "png"
	}
	key := mediaStore.ObjectKey(*user.RelationshipID, user.ID, photoDate, ext)
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

func handlePhotosUploadLocal(w http.ResponseWriter, r *http.Request) {
	if applyCORS(w, r) || r.Method != http.MethodPut {
		if r.Method != http.MethodPut {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		}
		return
	}
	if mediaStore == nil || mediaStore.UsesS3() {
		http.Error(w, "not available", http.StatusNotFound)
		return
	}
	key := r.URL.Query().Get("key")
	if key == "" || strings.Contains(key, "..") {
		http.Error(w, "invalid key", http.StatusBadRequest)
		return
	}
	data, err := io.ReadAll(io.LimitReader(r.Body, 6<<20))
	if err != nil {
		http.Error(w, "read failed", http.StatusBadRequest)
		return
	}
	if err := mediaStore.SaveLocal(key, data); err != nil {
		http.Error(w, "save failed", http.StatusInternalServerError)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func handlePhotosFile(w http.ResponseWriter, r *http.Request) {
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
	relationshipID, err := getRelationshipIDForDevice(deviceID)
	if err != nil {
		http.Error(w, "not paired", http.StatusForbidden)
		return
	}
	key := r.URL.Query().Get("key")
	if key == "" || (!strings.HasPrefix(key, "photos/"+relationshipID+"/") && !strings.HasPrefix(key, "avatars/"+relationshipID+"/")) {
		http.Error(w, "forbidden", http.StatusForbidden)
		return
	}
	if mediaStore == nil {
		http.Error(w, "storage unavailable", http.StatusServiceUnavailable)
		return
	}
	data, err := mediaStore.ReadLocal(key)
	if err != nil {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	ct := "image/jpeg"
	if strings.HasSuffix(strings.ToLower(key), ".png") {
		ct = "image/png"
	}
	w.Header().Set("Content-Type", ct)
	w.Write(data)
}

func handlePhotosToday(w http.ResponseWriter, r *http.Request) {
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
	today := clientLocalDate(r)
	resp := PhotoTodayResponse{}
	current, longest, both := computePhotoStreak(*user.RelationshipID, today)
	resp.CurrentStreak = current
	resp.LongestStreak = longest
	resp.BothSentToday = both

	rows, err := db.Query(
		`SELECT id::text, user_id::text, photo_date::text, object_key, COALESCE(caption,''), created_at
         FROM daily_photos WHERE relationship_id = $1 AND photo_date = $2::date`,
		*user.RelationshipID, today,
	)
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	for rows.Next() {
		var id, uid, pdate, objectKey, caption string
		var created time.Time
		if rows.Scan(&id, &uid, &pdate, &objectKey, &caption, &created) != nil {
			continue
		}
		dto, err := photoToDTO(id, pdate, objectKey, caption, uid, user.ID, created)
		if err != nil {
			continue
		}
		if uid == user.ID {
			resp.Mine = &dto
		} else {
			resp.Partner = &dto
		}
	}
	json.NewEncoder(w).Encode(resp)
}

func handlePhotosPost(w http.ResponseWriter, r *http.Request) {
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
		ObjectKey string  `json:"objectKey"`
		Caption   *string `json:"caption"`
		PhotoDate string  `json:"photoDate"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}
	photoDate := strings.TrimSpace(body.PhotoDate)
	if photoDate == "" {
		photoDate = clientLocalDate(r)
	}
	key := strings.TrimSpace(body.ObjectKey)
	if key == "" || !strings.HasPrefix(key, "photos/"+*user.RelationshipID+"/"+user.ID+"/") {
		http.Error(w, "invalid objectKey", http.StatusBadRequest)
		return
	}
	var cap string
	if body.Caption != nil {
		cap = strings.TrimSpace(*body.Caption)
		if len(cap) > 200 {
			cap = cap[:200]
		}
	}
	var id string
	var created time.Time
	err = db.QueryRow(
		`INSERT INTO daily_photos (relationship_id, user_id, photo_date, object_key, caption)
         VALUES ($1, $2, $3::date, $4, NULLIF($5,''))
         ON CONFLICT (user_id, photo_date) DO UPDATE SET object_key = EXCLUDED.object_key, caption = EXCLUDED.caption
         RETURNING id::text, created_at`,
		*user.RelationshipID, user.ID, photoDate, key, cap,
	).Scan(&id, &created)
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	dto, err := photoToDTO(id, photoDate, key, cap, user.ID, user.ID, created)
	if err != nil {
		http.Error(w, "storage error", http.StatusInternalServerError)
		return
	}
	current, longest, both := computePhotoStreak(*user.RelationshipID, photoDate)
	resp := PhotoPostResponse{
		DailyPhotoDTO: dto,
		CurrentStreak: current,
		LongestStreak: longest,
		BothSentToday: both,
	}
	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(resp)
	broadcastServerEvent(*user.RelationshipID, "SYNC_PHOTOS", map[string]any{})
}

func handlePhotosHistory(w http.ResponseWriter, r *http.Request) {
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
	limit := 14
	if l := r.URL.Query().Get("limit"); l != "" {
		if n, err := strconv.Atoi(l); err == nil && n > 0 && n <= 60 {
			limit = n
		}
	}
	cursor := r.URL.Query().Get("cursor")
	rows, err := db.Query(
		`SELECT DISTINCT photo_date::text FROM daily_photos
         WHERE relationship_id = $1 AND ($2 = '' OR photo_date < $2::date)
         ORDER BY photo_date DESC LIMIT $3`,
		*user.RelationshipID, cursor, limit,
	)
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	defer rows.Close()
	var dates []string
	for rows.Next() {
		var d string
		if rows.Scan(&d) == nil {
			dates = append(dates, d)
		}
	}
	days := []PhotoDayGroup{}
	for _, d := range dates {
		g := PhotoDayGroup{PhotoDate: d}
		pr, _ := db.Query(
			`SELECT id::text, user_id::text, object_key, COALESCE(caption,''), created_at
             FROM daily_photos WHERE relationship_id = $1 AND photo_date = $2::date`,
			*user.RelationshipID, d,
		)
		for pr.Next() {
			var id, uid, objectKey, caption string
			var created time.Time
			if pr.Scan(&id, &uid, &objectKey, &caption, &created) != nil {
				continue
			}
			dto, err := photoToDTO(id, d, objectKey, caption, uid, user.ID, created)
			if err != nil {
				continue
			}
			if uid == user.ID {
				g.Mine = &dto
			} else {
				g.Partner = &dto
			}
		}
		pr.Close()
		g.BothSent = g.Mine != nil && g.Partner != nil
		days = append(days, g)
	}
	var nextCursor *string
	if len(dates) == limit {
		c := dates[len(dates)-1]
		nextCursor = &c
	}
	json.NewEncoder(w).Encode(map[string]any{"days": days, "nextCursor": nextCursor})
}

func handlePhotosStreak(w http.ResponseWriter, r *http.Request) {
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
	relationshipID, err := getRelationshipIDForDevice(deviceID)
	if err != nil {
		http.Error(w, "not paired", http.StatusForbidden)
		return
	}
	today := clientLocalDate(r)
	current, longest, both := computePhotoStreak(relationshipID, today)
	json.NewEncoder(w).Encode(map[string]any{
		"currentStreak":     current,
		"longestStreak":     longest,
		"bothSentToday":     both,
	})
}

// --- Trivia ---

type TriviaGameDTO struct {
	ID        string         `json:"id"`
	Status    string         `json:"status"`
	Scores    map[string]int `json:"scores"`
	Rounds    []TriviaRoundDTO `json:"rounds"`
}

type TriviaRoundDTO struct {
	ID                 string   `json:"id"`
	Prompt             string   `json:"prompt"`
	Options            []string `json:"options"`
	CorrectIndex       int      `json:"correctIndex,omitempty"`
	PartnerAnswerIndex *int     `json:"partnerAnswerIndex,omitempty"`
	IsMine             bool     `json:"isMine"`
	Answered           bool     `json:"answered"`
}

func handleTriviaActive(w http.ResponseWriter, r *http.Request) {
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
	switch r.Method {
	case http.MethodGet:
		var gameID string
		err = db.QueryRow(
			`SELECT id::text FROM trivia_games WHERE relationship_id = $1 AND status = 'active' ORDER BY created_at DESC LIMIT 1`,
			*user.RelationshipID,
		).Scan(&gameID)
		if err == sql.ErrNoRows {
			json.NewEncoder(w).Encode(nil)
			return
		}
		if err != nil {
			http.Error(w, "db error", http.StatusInternalServerError)
			return
		}
		json.NewEncoder(w).Encode(loadTriviaGame(gameID, user.ID))
	case http.MethodPost:
		var gameID string
		err = db.QueryRow(
			`INSERT INTO trivia_games (relationship_id, scores) VALUES ($1, '{}') RETURNING id::text`,
			*user.RelationshipID,
		).Scan(&gameID)
		if err != nil {
			http.Error(w, "db error", http.StatusInternalServerError)
			return
		}
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(loadTriviaGame(gameID, user.ID))
		broadcastServerEvent(*user.RelationshipID, "SYNC_GAMES", map[string]any{})
	default:
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
	}
}

func loadTriviaGame(gameID, viewerID string) TriviaGameDTO {
	var status string
	var scoresJSON []byte
	_ = db.QueryRow(`SELECT status, scores FROM trivia_games WHERE id::text = $1`, gameID).Scan(&status, &scoresJSON)
	scores := map[string]int{}
	_ = json.Unmarshal(scoresJSON, &scores)
	dto := TriviaGameDTO{ID: gameID, Status: status, Scores: scores, Rounds: []TriviaRoundDTO{}}
	rows, _ := db.Query(
		`SELECT id::text, author_user_id::text, prompt, options, correct_index, partner_answer_index
         FROM trivia_rounds WHERE game_id::text = $1 ORDER BY created_at ASC`, gameID,
	)
	defer rows.Close()
	for rows.Next() {
		var id, author, prompt string
		var optsJSON []byte
		var correct int
		var partnerAns sql.NullInt64
		if rows.Scan(&id, &author, &prompt, &optsJSON, &correct, &partnerAns) != nil {
			continue
		}
		var opts []string
		_ = json.Unmarshal(optsJSON, &opts)
		rd := TriviaRoundDTO{
			ID:       id,
			Prompt:   prompt,
			Options:  opts,
			IsMine:   author == viewerID,
			Answered: partnerAns.Valid,
		}
		if author == viewerID {
			rd.CorrectIndex = correct
		}
		if partnerAns.Valid {
			v := int(partnerAns.Int64)
			rd.PartnerAnswerIndex = &v
		}
		dto.Rounds = append(dto.Rounds, rd)
	}
	return dto
}

func handleTriviaRounds(w http.ResponseWriter, r *http.Request) {
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
	gameID := strings.TrimPrefix(r.URL.Path, "/api/games/trivia/")
	gameID = strings.TrimSuffix(gameID, "/rounds")
	var body struct {
		Prompt       string   `json:"prompt"`
		Options      []string `json:"options"`
		CorrectIndex int      `json:"correctIndex"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}
	if len(body.Options) < 2 || body.CorrectIndex < 0 || body.CorrectIndex >= len(body.Options) {
		http.Error(w, "invalid round", http.StatusBadRequest)
		return
	}
	optsJSON, _ := json.Marshal(body.Options)
	_, err = db.Exec(
		`INSERT INTO trivia_rounds (game_id, author_user_id, prompt, options, correct_index)
         VALUES ($1::uuid, $2, $3, $4, $5)`,
		gameID, user.ID, strings.TrimSpace(body.Prompt), optsJSON, body.CorrectIndex,
	)
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(loadTriviaGame(gameID, user.ID))
	broadcastServerEvent(*user.RelationshipID, "SYNC_GAMES", map[string]any{})
}

func handleTriviaAnswer(w http.ResponseWriter, r *http.Request) {
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
	// path: /api/games/trivia/{gameId}/rounds/{roundId}/answer
	parts := strings.Split(strings.TrimPrefix(r.URL.Path, "/api/games/trivia/"), "/")
	if len(parts) < 3 {
		http.Error(w, "bad path", http.StatusBadRequest)
		return
	}
	gameID, roundID := parts[0], parts[2]
	var body struct {
		AnswerIndex int `json:"answerIndex"`
	}
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		http.Error(w, "invalid body", http.StatusBadRequest)
		return
	}
	var authorID string
	var correct int
	err = db.QueryRow(
		`SELECT author_user_id::text, correct_index FROM trivia_rounds WHERE id::text = $1 AND game_id::text = $2`,
		roundID, gameID,
	).Scan(&authorID, &correct)
	if err != nil || authorID == user.ID {
		http.Error(w, "not found", http.StatusNotFound)
		return
	}
	_, err = db.Exec(
		`UPDATE trivia_rounds SET partner_answer_index = $1, answered_at = NOW()
         WHERE id::text = $2 AND partner_answer_index IS NULL`,
		body.AnswerIndex, roundID,
	)
	if err != nil {
		http.Error(w, "db error", http.StatusInternalServerError)
		return
	}
	if body.AnswerIndex == correct {
		var scoresJSON []byte
		_ = db.QueryRow(`SELECT scores FROM trivia_games WHERE id::text = $1`, gameID).Scan(&scoresJSON)
		scores := map[string]int{}
		_ = json.Unmarshal(scoresJSON, &scores)
		scores[user.ID]++
		updated, _ := json.Marshal(scores)
		_, _ = db.Exec(`UPDATE trivia_games SET scores = $1 WHERE id::text = $2`, updated, gameID)
	}
	json.NewEncoder(w).Encode(loadTriviaGame(gameID, user.ID))
	broadcastServerEvent(*user.RelationshipID, "SYNC_GAMES", map[string]any{})
}

func registerFeatureRoutes() {
	registerProfileRoutes()
	http.HandleFunc("/api/profile/presence", handlePutProfilePresence)
	http.HandleFunc("/api/partner/presence", handleGetPartnerPresence)
	http.HandleFunc("/api/photos/presign", handlePhotosPresign)
	http.HandleFunc("/api/photos/upload-local", handlePhotosUploadLocal)
	http.HandleFunc("/api/photos/file", handlePhotosFile)
	http.HandleFunc("/api/photos/today", handlePhotosToday)
	http.HandleFunc("/api/photos", handlePhotosPost)
	http.HandleFunc("/api/photos/history", handlePhotosHistory)
	http.HandleFunc("/api/photos/streak", handlePhotosStreak)
	http.HandleFunc("/api/games/trivia/active", handleTriviaActive)
	http.HandleFunc("/api/games/trivia/", func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, "/answer") {
			handleTriviaAnswer(w, r)
			return
		}
		if strings.HasSuffix(r.URL.Path, "/rounds") {
			handleTriviaRounds(w, r)
			return
		}
		http.Error(w, "not found", http.StatusNotFound)
	})
}