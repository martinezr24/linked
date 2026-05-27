package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"sync"
	"crypto/rand"
	"time"

	"github.com/gorilla/websocket"
	_ "github.com/lib/pq"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

var (
	clients   = make(map[*websocket.Conn]bool)
	clientsMu sync.Mutex
	db        *sql.DB
)

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
    RelationshipID *string // nil if not yet paired
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

func handleConnections(w http.ResponseWriter, r *http.Request) {
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Printf("WebSocket upgrade failed: %v", err)
		return
	}

	clientsMu.Lock()
	clients[ws] = true
	clientsMu.Unlock()

	fmt.Printf("New client connected! Total active clients: %d\n", len(clients))

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

		processIncomingPayload(message)

		clientsMu.Lock()
		for client := range clients {
			if client != ws {
				if err := client.WriteMessage(messageType, message); err != nil {
					client.Close()
					delete(clients, client)
				}
			}
		}
		clientsMu.Unlock()
	}
}

func processIncomingPayload(rawMessage []byte) {
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
			`INSERT INTO itinerary_items (id, text) VALUES ($1, $2)`,
			item.ID, item.Text,
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
		_, err := db.Exec(`DELETE FROM itinerary_items WHERE id = $1`, item.ID)
		if err != nil {
			fmt.Printf("Database delete failed for %s: %v\n", item.ID, err)
		} else {
			fmt.Printf("Deleted item: %s\n", item.ID)
		}
	}
}

func handleGetItinerary(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	rows, err := db.Query(`SELECT id, text FROM itinerary_items ORDER BY created_at ASC`)
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

func main() {
	initDB()
	defer db.Close()

	http.HandleFunc("/ws", handleConnections)
	http.HandleFunc("/api/itinerary", handleGetItinerary)
	http.HandleFunc("/api/pairing/generate", handlePairingGenerate)
	http.HandleFunc("/api/pairing/link",     handlePairingLink)	

	fmt.Println("Linked engine running with persistence on :8080...")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

func getOrCreateUser(deviceID string) (*User, error) {
    var u User
    err := db.QueryRow(
        `SELECT id, device_id, relationship_id
         FROM users WHERE device_id = $1`, deviceID,
    ).Scan(&u.ID, &u.DeviceID, &u.RelationshipID)
    if err == sql.ErrNoRows {
        // first time this device is seen — create a row
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

func handlePairingGenerate(w http.ResponseWriter, r *http.Request) {
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

    // generate random 6-digit numeric code
    b := make([]byte, 3) // 3 bytes → 6 hex chars
    rand.Read(b)
    code := fmt.Sprintf(
		"%06d",
		(int(b[0])<<16 | int(b[1])<<8 | int(b[2])) % 1000000,
	  )

    expiresAt := time.Now().Add(10 * time.Minute)

    // delete any old code from this user first
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

    // create the relationship
    var relationshipID string
    err = tx.QueryRow(
        `INSERT INTO relationships DEFAULT VALUES RETURNING id`,
    ).Scan(&relationshipID)
    if err != nil {
        http.Error(w, "db error", http.StatusInternalServerError)
        return
    }

    // link both users
    _, err = tx.Exec(
        `UPDATE users SET relationship_id = $1 WHERE id IN ($2, $3)`,
        relationshipID, creatorUserID, user.ID,
    )
    if err != nil {
        http.Error(w, "db error", http.StatusInternalServerError)
        return
    }

    // delete the used code
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