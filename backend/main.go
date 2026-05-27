package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"sync"

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

	fmt.Println("Linked engine running with persistence on :8080...")
	log.Fatal(http.ListenAndServe(":8080", nil))
}
