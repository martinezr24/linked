package main

import (
	"fmt"
	"log"
	"net/http"
	"sync"

	"github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

// GLOBAL STATE:
// clients maps active WebSocket pointers to a boolean.
// clientsMu is the mutex lock preventing concurrent map writes.
var (
	clients   = make(map[*websocket.Conn]bool)
	clientsMu sync.Mutex
)

func handleConnections(w http.ResponseWriter, r *http.Request) {
	ws, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Fatal(err)
	}
	
	// Lock the mutex, add the new socket to our map, unlock.
	clientsMu.Lock()
	clients[ws] = true
	clientsMu.Unlock()

	fmt.Printf("New client connected! Total clients: %d\n", len(clients))

	// Cleanup when the function exits
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

		fmt.Printf("Received: %s\n", message)

		// BROADCAST LOOP:
		// Send the message to every client EXCEPT the sender
		clientsMu.Lock()
		for client := range clients {
			if client != ws {
				err := client.WriteMessage(messageType, message)
				if err != nil {
					fmt.Printf("Error writing to client: %v\n", err)
					client.Close()
					delete(clients, client)
				}
			}
		}
		clientsMu.Unlock()
	}
}

func main() {
	http.HandleFunc("/ws", handleConnections)
	fmt.Println("Linked routing engine running on :8080...")
	log.Fatal(http.ListenAndServe(":8080", nil))
}