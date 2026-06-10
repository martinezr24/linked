package games

import (
	"encoding/json"
	"fmt"
)

type GameEngine interface {
	Type() string
	InitialState(playerX, playerO string) ([]byte, error)
	ApplyMove(state []byte, move json.RawMessage, actorUserID, turnUserID string) (newState []byte, winner *string, draw bool, err error)
}

var registry = map[string]GameEngine{}

func Register(engine GameEngine) {
	registry[engine.Type()] = engine
}

func Get(gameType string) (GameEngine, bool) {
	e, ok := registry[gameType]
	return e, ok
}

func init() {
	Register(&Connect4Engine{})
}

func MustGet(gameType string) (GameEngine, error) {
	e, ok := Get(gameType)
	if !ok {
		return nil, fmt.Errorf("unknown game type: %s", gameType)
	}
	return e, nil
}
