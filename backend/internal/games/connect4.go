package games

import (
	"encoding/json"
	"errors"
)

const Connect4Type = "connect4"

const connect4Rows = 6
const connect4Cols = 7

type Connect4State struct {
	Rows  int     `json:"rows"`
	Cols  int     `json:"cols"`
	Cells [][]int `json:"cells"`
	Moves []int   `json:"moves"`
}

type Connect4Move struct {
	Column int `json:"column"`
}

type Connect4Engine struct{}

func (Connect4Engine) Type() string { return Connect4Type }

func (Connect4Engine) InitialState(playerX, playerO string) ([]byte, error) {
	_ = playerX
	_ = playerO
	cells := make([][]int, connect4Rows)
	for r := range cells {
		cells[r] = make([]int, connect4Cols)
	}
	state := Connect4State{
		Rows:  connect4Rows,
		Cols:  connect4Cols,
		Cells: cells,
		Moves: []int{},
	}
	return json.Marshal(state)
}

func (Connect4Engine) ApplyMove(state []byte, move json.RawMessage, actorUserID, turnUserID string) ([]byte, *string, bool, error) {
	_ = actorUserID
	if turnUserID == "" {
		return nil, nil, false, errors.New("no active turn")
	}
	var s Connect4State
	if err := json.Unmarshal(state, &s); err != nil {
		return nil, nil, false, err
	}
	var m Connect4Move
	if err := json.Unmarshal(move, &m); err != nil {
		return nil, nil, false, err
	}
	if m.Column < 0 || m.Column >= s.Cols {
		return nil, nil, false, errors.New("invalid column")
	}
	player := 1
	if len(s.Moves)%2 == 1 {
		player = 2
	}
	row := -1
	for r := s.Rows - 1; r >= 0; r-- {
		if s.Cells[r][m.Column] == 0 {
			row = r
			break
		}
	}
	if row < 0 {
		return nil, nil, false, errors.New("column full")
	}
	s.Cells[row][m.Column] = player
	s.Moves = append(s.Moves, m.Column)
	newState, _ := json.Marshal(s)
	if winnerPlayer := checkConnect4Win(s.Cells, row, m.Column, player); winnerPlayer > 0 {
		w := turnUserID
		return newState, &w, false, nil
	}
	if len(s.Moves) >= s.Rows*s.Cols {
		return newState, nil, true, nil
	}
	return newState, nil, false, nil
}

func checkConnect4Win(cells [][]int, row, col, player int) int {
	dirs := [][2]int{{0, 1}, {1, 0}, {1, 1}, {1, -1}}
	for _, d := range dirs {
		count := 1
		for sign := -1; sign <= 1; sign += 2 {
			r, c := row+d[0]*sign, col+d[1]*sign
			for r >= 0 && r < len(cells) && c >= 0 && c < len(cells[0]) && cells[r][c] == player {
				count++
				r += d[0] * sign
				c += d[1] * sign
			}
		}
		if count >= 4 {
			return player
		}
	}
	return 0
}
