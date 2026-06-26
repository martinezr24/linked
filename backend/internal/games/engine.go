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

// TurnDecider lets an engine control who plays next instead of the default
// behaviour of always flipping to the other player. Engines that don't
// implement this interface fall back to alternating turns. Useful for games
// like Dots & Boxes where completing a box grants another turn.
type TurnDecider interface {
	NextActor(newState []byte, actorUserID, playerX, playerO string) (string, error)
}

// StateViewer lets an engine redact the board state per viewer before it is
// sent to a client. Engines that don't implement this expose the full state to
// both players. Useful for games with hidden information like Battleship.
type StateViewer interface {
	ViewState(state []byte, viewerNumber int) ([]byte, error)
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
	Register(&TicTacToeEngine{})
	Register(&WordGuessEngine{})
	Register(&DotsBoxesEngine{})
	Register(&BattleshipEngine{})
}

func MustGet(gameType string) (GameEngine, error) {
	e, ok := Get(gameType)
	if !ok {
		return nil, fmt.Errorf("unknown game type: %s", gameType)
	}
	return e, nil
}
