package games

import (
	"encoding/json"
	"errors"
	"math/rand"
)

const BattleshipType = "battleship"

const battleshipSize = 10

var battleshipShips = []int{5, 4, 3, 3, 2}

type battleshipBoard struct {
	Ships [][]int `json:"ships"` // ship length id (>0) or 0
	Shots [][]int `json:"shots"` // 0 untargeted, 1 miss, 2 hit
}

type BattleshipState struct {
	Size   int                `json:"size"`
	Boards [2]battleshipBoard `json:"boards"` // [0]=player1, [1]=player2
	Turn   int                `json:"turn"`   // current player number (1 or 2)
}

type BattleshipMove struct {
	Row int `json:"row"`
	Col int `json:"col"`
}

type BattleshipEngine struct{}

func (BattleshipEngine) Type() string { return BattleshipType }

func newGrid(n int) [][]int {
	g := make([][]int, n)
	for r := range g {
		g[r] = make([]int, n)
	}
	return g
}

func placeBattleshipFleet(n int) [][]int {
	ships := newGrid(n)
	for _, length := range battleshipShips {
		for {
			horizontal := rand.Intn(2) == 0
			var r, c int
			if horizontal {
				r = rand.Intn(n)
				c = rand.Intn(n - length + 1)
			} else {
				r = rand.Intn(n - length + 1)
				c = rand.Intn(n)
			}
			ok := true
			for i := 0; i < length; i++ {
				rr, cc := r, c
				if horizontal {
					cc += i
				} else {
					rr += i
				}
				if ships[rr][cc] != 0 {
					ok = false
					break
				}
			}
			if !ok {
				continue
			}
			for i := 0; i < length; i++ {
				rr, cc := r, c
				if horizontal {
					cc += i
				} else {
					rr += i
				}
				ships[rr][cc] = length
			}
			break
		}
	}
	return ships
}

func (BattleshipEngine) InitialState(playerX, playerO string) ([]byte, error) {
	_ = playerX
	_ = playerO
	n := battleshipSize
	state := BattleshipState{
		Size: n,
		Turn: 1,
		Boards: [2]battleshipBoard{
			{Ships: placeBattleshipFleet(n), Shots: newGrid(n)},
			{Ships: placeBattleshipFleet(n), Shots: newGrid(n)},
		},
	}
	return json.Marshal(state)
}

func (BattleshipEngine) ApplyMove(state []byte, move json.RawMessage, actorUserID, turnUserID string) ([]byte, *string, bool, error) {
	_ = actorUserID
	if turnUserID == "" {
		return nil, nil, false, errors.New("no active turn")
	}
	var s BattleshipState
	if err := json.Unmarshal(state, &s); err != nil {
		return nil, nil, false, err
	}
	var m BattleshipMove
	if err := json.Unmarshal(move, &m); err != nil {
		return nil, nil, false, err
	}
	if m.Row < 0 || m.Row >= s.Size || m.Col < 0 || m.Col >= s.Size {
		return nil, nil, false, errors.New("invalid target")
	}
	oppIdx := 0
	if s.Turn == 1 {
		oppIdx = 1
	}
	opp := &s.Boards[oppIdx]
	if opp.Shots[m.Row][m.Col] != 0 {
		return nil, nil, false, errors.New("already fired there")
	}
	if opp.Ships[m.Row][m.Col] > 0 {
		opp.Shots[m.Row][m.Col] = 2 // hit
	} else {
		opp.Shots[m.Row][m.Col] = 1 // miss
	}

	// Win when every ship cell on the opponent board has been hit.
	allSunk := true
	for r := 0; r < s.Size; r++ {
		for c := 0; c < s.Size; c++ {
			if opp.Ships[r][c] > 0 && opp.Shots[r][c] != 2 {
				allSunk = false
				break
			}
		}
		if !allSunk {
			break
		}
	}
	if allSunk {
		newState, _ := json.Marshal(s)
		w := turnUserID
		return newState, &w, false, nil
	}

	if s.Turn == 1 {
		s.Turn = 2
	} else {
		s.Turn = 1
	}
	newState, _ := json.Marshal(s)
	return newState, nil, false, nil
}

// ViewState hides the opponent's un-hit ship positions from the viewer.
func (BattleshipEngine) ViewState(state []byte, viewerNumber int) ([]byte, error) {
	var s BattleshipState
	if err := json.Unmarshal(state, &s); err != nil {
		return nil, err
	}
	redact := func(idx int) {
		b := &s.Boards[idx]
		hidden := make([][]int, s.Size)
		for r := 0; r < s.Size; r++ {
			hidden[r] = make([]int, s.Size)
			for c := 0; c < s.Size; c++ {
				if b.Shots[r][c] == 2 {
					hidden[r][c] = b.Ships[r][c] // reveal sunk/hit cells
				}
			}
		}
		b.Ships = hidden
	}
	switch viewerNumber {
	case 1:
		redact(1) // hide player2's board ships
	case 2:
		redact(0) // hide player1's board ships
	default:
		redact(0)
		redact(1)
	}
	return json.Marshal(s)
}
