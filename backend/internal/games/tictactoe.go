package games

import (
	"encoding/json"
	"errors"
)

const TicTacToeType = "tictactoe"

type TicTacToeState struct {
	Cells []int `json:"cells"` // 9 cells, row-major: 0=empty, 1=playerX, 2=playerO
	Moves int   `json:"moves"`
}

type TicTacToeMove struct {
	Cell int `json:"cell"`
}

type TicTacToeEngine struct{}

func (TicTacToeEngine) Type() string { return TicTacToeType }

func (TicTacToeEngine) InitialState(playerX, playerO string) ([]byte, error) {
	_ = playerX
	_ = playerO
	return json.Marshal(TicTacToeState{Cells: make([]int, 9), Moves: 0})
}

func (TicTacToeEngine) ApplyMove(state []byte, move json.RawMessage, actorUserID, turnUserID string) ([]byte, *string, bool, error) {
	_ = actorUserID
	if turnUserID == "" {
		return nil, nil, false, errors.New("no active turn")
	}
	var s TicTacToeState
	if err := json.Unmarshal(state, &s); err != nil {
		return nil, nil, false, err
	}
	var m TicTacToeMove
	if err := json.Unmarshal(move, &m); err != nil {
		return nil, nil, false, err
	}
	if m.Cell < 0 || m.Cell >= 9 {
		return nil, nil, false, errors.New("invalid cell")
	}
	if s.Cells[m.Cell] != 0 {
		return nil, nil, false, errors.New("cell taken")
	}
	player := 1
	if s.Moves%2 == 1 {
		player = 2
	}
	s.Cells[m.Cell] = player
	s.Moves++
	newState, _ := json.Marshal(s)
	if checkTicTacToeWin(s.Cells, player) {
		w := turnUserID
		return newState, &w, false, nil
	}
	if s.Moves >= 9 {
		return newState, nil, true, nil
	}
	return newState, nil, false, nil
}

func checkTicTacToeWin(cells []int, player int) bool {
	lines := [8][3]int{
		{0, 1, 2}, {3, 4, 5}, {6, 7, 8}, // rows
		{0, 3, 6}, {1, 4, 7}, {2, 5, 8}, // cols
		{0, 4, 8}, {2, 4, 6}, // diagonals
	}
	for _, l := range lines {
		if cells[l[0]] == player && cells[l[1]] == player && cells[l[2]] == player {
			return true
		}
	}
	return false
}
