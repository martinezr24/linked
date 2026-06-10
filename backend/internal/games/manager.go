package games

import (
	"database/sql"
	"encoding/json"
	"errors"
	"sync"

	"github.com/gorilla/websocket"
)

type BroadcastFunc func(relationshipID, action string, payload map[string]any)

type Manager struct {
	mu        sync.Mutex
	rooms     map[string]map[*websocket.Conn]string // gameId -> conn -> userId
	db        *sql.DB
	broadcast BroadcastFunc
}

func NewManager(db *sql.DB, broadcast BroadcastFunc) *Manager {
	return &Manager{
		rooms:     make(map[string]map[*websocket.Conn]string),
		db:        db,
		broadcast: broadcast,
	}
}

type GridGameDTO struct {
	ID                string          `json:"id"`
	GameType          string          `json:"gameType"`
	Status            string          `json:"status"`
	BoardState        json.RawMessage `json:"boardState"`
	CurrentTurnUserID *string         `json:"currentTurnUserId,omitempty"`
	WinnerUserID      *string         `json:"winnerUserId,omitempty"`
	PlayerXUserID     string          `json:"playerXUserId"`
	PlayerOUserID     *string         `json:"playerOUserId,omitempty"`
	IsMyTurn          bool            `json:"isMyTurn"`
	MyPlayerNumber    int             `json:"myPlayerNumber"`
}

func (m *Manager) Join(conn *websocket.Conn, gameID, userID string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.rooms[gameID] == nil {
		m.rooms[gameID] = make(map[*websocket.Conn]string)
	}
	m.rooms[gameID][conn] = userID
}

func (m *Manager) Leave(conn *websocket.Conn) {
	m.mu.Lock()
	defer m.mu.Unlock()
	for gameID, conns := range m.rooms {
		delete(conns, conn)
		if len(conns) == 0 {
			delete(m.rooms, gameID)
		}
	}
}

func (m *Manager) BroadcastGameState(relationshipID, gameID, viewerID string) {
	dto, err := m.LoadGame(gameID, viewerID)
	if err != nil {
		return
	}
	payload := map[string]any{
		"gameId": gameID,
		"game":   dto,
	}
	m.broadcast(relationshipID, "GAME_STATE", payload)
}

func (m *Manager) LoadGame(gameID, viewerID string) (GridGameDTO, error) {
	var gameType, status string
	var boardState []byte
	var turnID, winnerID, playerX, playerO sql.NullString
	err := m.db.QueryRow(
		`SELECT game_type, status, board_state, current_turn_user_id::text,
                winner_user_id::text, player_x_user_id::text, player_o_user_id::text
         FROM grid_games WHERE id::text = $1`,
		gameID,
	).Scan(&gameType, &status, &boardState, &turnID, &winnerID, &playerX, &playerO)
	if err != nil {
		return GridGameDTO{}, err
	}
	dto := GridGameDTO{
		ID:            gameID,
		GameType:      gameType,
		Status:        status,
		BoardState:    boardState,
		PlayerXUserID: playerX.String,
	}
	if turnID.Valid {
		t := turnID.String
		dto.CurrentTurnUserID = &t
		dto.IsMyTurn = t == viewerID
	}
	if winnerID.Valid {
		w := winnerID.String
		dto.WinnerUserID = &w
	}
	if playerO.Valid {
		o := playerO.String
		dto.PlayerOUserID = &o
	}
	if viewerID == playerX.String {
		dto.MyPlayerNumber = 1
	} else if playerO.Valid && viewerID == playerO.String {
		dto.MyPlayerNumber = 2
	}
	return dto, nil
}

func (m *Manager) HandleMove(relationshipID, gameID, userID string, move json.RawMessage) error {
	var status, gameType, turnID, playerX, playerO sql.NullString
	var boardState []byte
	err := m.db.QueryRow(
		`SELECT status, game_type, current_turn_user_id::text, board_state,
                player_x_user_id::text, player_o_user_id::text
         FROM grid_games WHERE id::text = $1 AND relationship_id::text = $2`,
		gameID, relationshipID,
	).Scan(&status, &gameType, &turnID, &boardState, &playerX, &playerO)
	if err != nil {
		return err
	}
	if status.String != "active" {
		return errors.New("game not active")
	}
	if !turnID.Valid || turnID.String != userID {
		return errors.New("not your turn")
	}
	engine, err := MustGet(gameType.String)
	if err != nil {
		return err
	}
	newState, winner, draw, err := engine.ApplyMove(boardState, move, userID, userID)
	if err != nil {
		return err
	}
	newStatus := "active"
	var winnerUserID *string
	var nextTurn *string
	if winner != nil {
		newStatus = "finished"
		winnerUserID = winner
	} else if draw {
		newStatus = "finished"
	} else {
		if userID == playerX.String && playerO.Valid {
			t := playerO.String
			nextTurn = &t
		} else if playerO.Valid {
			t := playerX.String
			nextTurn = &t
		}
	}
	_, err = m.db.Exec(
		`UPDATE grid_games SET board_state = $1, status = $2, winner_user_id = $3,
         current_turn_user_id = $4, updated_at = NOW() WHERE id::text = $5`,
		newState, newStatus, winnerUserID, nextTurn, gameID,
	)
	if err != nil {
		return err
	}
	m.BroadcastGameState(relationshipID, gameID, userID)
	if newStatus == "finished" {
		payload := map[string]any{"gameId": gameID}
		if winnerUserID != nil {
			payload["winnerUserId"] = *winnerUserID
		}
		if draw {
			payload["draw"] = true
		}
		m.broadcast(relationshipID, "GAME_OVER", payload)
	}
	return nil
}

func (m *Manager) CreateGame(relationshipID, userID, gameType string) (GridGameDTO, error) {
	engine, err := MustGet(gameType)
	if err != nil {
		return GridGameDTO{}, err
	}
	var existingID string
	err = m.db.QueryRow(
		`SELECT id::text FROM grid_games
         WHERE relationship_id = $1 AND game_type = $2 AND status IN ('waiting','active')
         ORDER BY created_at DESC LIMIT 1`,
		relationshipID, gameType,
	).Scan(&existingID)
	if err == nil {
		return m.LoadGame(existingID, userID)
	}
	state, err := engine.InitialState(userID, "")
	if err != nil {
		return GridGameDTO{}, err
	}
	var gameID string
	err = m.db.QueryRow(
		`INSERT INTO grid_games (relationship_id, game_type, status, board_state, player_x_user_id, current_turn_user_id)
         VALUES ($1, $2, 'waiting', $3, $4, $4) RETURNING id::text`,
		relationshipID, gameType, state, userID,
	).Scan(&gameID)
	if err != nil {
		return GridGameDTO{}, err
	}
	return m.LoadGame(gameID, userID)
}

func (m *Manager) JoinGame(relationshipID, gameID, userID string) (GridGameDTO, error) {
	var status, playerX sql.NullString
	var playerO sql.NullString
	err := m.db.QueryRow(
		`SELECT status, player_x_user_id::text, player_o_user_id::text
         FROM grid_games WHERE id::text = $1 AND relationship_id::text = $2`,
		gameID, relationshipID,
	).Scan(&status, &playerX, &playerO)
	if err != nil {
		return GridGameDTO{}, err
	}
	if playerO.Valid && playerO.String != "" && playerO.String != userID && playerX.String != userID {
		return GridGameDTO{}, errors.New("game full")
	}
	if !playerO.Valid || playerO.String == "" {
		if playerX.String == userID {
			return m.LoadGame(gameID, userID)
		}
		_, err = m.db.Exec(
			`UPDATE grid_games SET player_o_user_id = $1, status = 'active', current_turn_user_id = $2, updated_at = NOW()
             WHERE id::text = $3 AND status = 'waiting'`,
			userID, playerX.String, gameID,
		)
		if err != nil {
			return GridGameDTO{}, err
		}
	}
	dto, err := m.LoadGame(gameID, userID)
	if err != nil {
		return dto, err
	}
	m.BroadcastGameState(relationshipID, gameID, userID)
	return dto, nil
}

func (m *Manager) GetActiveGame(relationshipID, userID, gameType string) (*GridGameDTO, error) {
	var gameID string
	err := m.db.QueryRow(
		`SELECT id::text FROM grid_games
         WHERE relationship_id = $1 AND game_type = $2 AND status IN ('waiting','active')
         ORDER BY created_at DESC LIMIT 1`,
		relationshipID, gameType,
	).Scan(&gameID)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	dto, err := m.LoadGame(gameID, userID)
	if err != nil {
		return nil, err
	}
	return &dto, nil
}

func (m *Manager) HandleWSJoin(conn *websocket.Conn, relationshipID, userID string, payload json.RawMessage) {
	var body struct {
		GameID string `json:"gameId"`
	}
	if json.Unmarshal(payload, &body) != nil || body.GameID == "" {
		return
	}
	m.Join(conn, body.GameID, userID)
	m.BroadcastGameState(relationshipID, body.GameID, userID)
}

func (m *Manager) HandleWSMove(conn *websocket.Conn, relationshipID, userID string, payload json.RawMessage) {
	var body struct {
		GameID string          `json:"gameId"`
		Move   json.RawMessage `json:"move"`
	}
	if json.Unmarshal(payload, &body) != nil || body.GameID == "" {
		return
	}
	_ = conn
	_ = m.HandleMove(relationshipID, body.GameID, userID, body.Move)
}
