package ws

import (
	"encoding/json"
	"sync"

	"github.com/gorilla/websocket"
)

type Client struct {
	Conn           *websocket.Conn
	RelationshipID string
}

type Hub struct {
	mu      sync.Mutex
	clients map[*websocket.Conn]*Client
}

func NewHub() *Hub {
	return &Hub{clients: make(map[*websocket.Conn]*Client)}
}

func (h *Hub) Register(conn *websocket.Conn, relationshipID string) {
	h.mu.Lock()
	defer h.mu.Unlock()
	h.clients[conn] = &Client{Conn: conn, RelationshipID: relationshipID}
}

func (h *Hub) Unregister(conn *websocket.Conn) {
	h.mu.Lock()
	defer h.mu.Unlock()
	delete(h.clients, conn)
}

func (h *Hub) BroadcastToRelationship(relationshipID, action string, payload any, exclude *websocket.Conn) {
	data, err := json.Marshal(map[string]any{"action": action, "payload": payload})
	if err != nil {
		return
	}
	h.mu.Lock()
	defer h.mu.Unlock()
	for conn, client := range h.clients {
		if client.RelationshipID != relationshipID {
			continue
		}
		if exclude != nil && conn == exclude {
			continue
		}
		if err := conn.WriteMessage(websocket.TextMessage, data); err != nil {
			conn.Close()
			delete(h.clients, conn)
		}
	}
}

func (h *Hub) BroadcastServerEvent(relationshipID, action string, payload any) {
	h.BroadcastToRelationship(relationshipID, action, payload, nil)
}
