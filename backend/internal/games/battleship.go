package games

import (
	"encoding/json"
	"errors"
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
	Phase  string             `json:"phase"`  // "setup" (placing ships) or "play"
	Placed [2]bool            `json:"placed"` // whether each player committed their fleet
}

// shipPlacement is one ship in a player's committed fleet.
type shipPlacement struct {
	Row        int  `json:"row"`
	Col        int  `json:"col"`
	Length     int  `json:"length"`
	Horizontal bool `json:"horizontal"`
}

type BattleshipMove struct {
	Type  string          `json:"type"`  // "place" during setup, "fire" during play
	Ships []shipPlacement `json:"ships"` // used when Type == "place"
	Row   int             `json:"row"`   // used when firing
	Col   int             `json:"col"`
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

// buildFleet validates a set of ship placements and returns the ships grid.
// It enforces the standard fleet composition, keeping ships in bounds, straight,
// and non-overlapping.
func buildFleet(n int, ships []shipPlacement) ([][]int, error) {
	if len(ships) != len(battleshipShips) {
		return nil, errors.New("wrong number of ships")
	}
	want := map[int]int{}
	for _, l := range battleshipShips {
		want[l]++
	}
	got := map[int]int{}
	grid := newGrid(n)
	for _, p := range ships {
		if p.Length < 1 {
			return nil, errors.New("invalid ship length")
		}
		got[p.Length]++
		for i := 0; i < p.Length; i++ {
			r, c := p.Row, p.Col
			if p.Horizontal {
				c += i
			} else {
				r += i
			}
			if r < 0 || r >= n || c < 0 || c >= n {
				return nil, errors.New("ship out of bounds")
			}
			if grid[r][c] != 0 {
				return nil, errors.New("ships overlap")
			}
			grid[r][c] = p.Length
		}
	}
	for l, cnt := range want {
		if got[l] != cnt {
			return nil, errors.New("fleet does not match required ships")
		}
	}
	for l := range got {
		if want[l] == 0 {
			return nil, errors.New("unexpected ship length")
		}
	}
	return grid, nil
}

func (BattleshipEngine) InitialState(playerX, playerO string) ([]byte, error) {
	_ = playerX
	_ = playerO
	n := battleshipSize
	state := BattleshipState{
		Size:  n,
		Turn:  1,
		Phase: "setup",
		Boards: [2]battleshipBoard{
			{Ships: newGrid(n), Shots: newGrid(n)},
			{Ships: newGrid(n), Shots: newGrid(n)},
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

	// Setup phase: the active player commits their whole fleet at once.
	if s.Phase == "setup" {
		idx := s.Turn - 1
		if idx < 0 || idx > 1 {
			return nil, nil, false, errors.New("invalid player")
		}
		if s.Placed[idx] {
			return nil, nil, false, errors.New("fleet already placed")
		}
		grid, err := buildFleet(s.Size, m.Ships)
		if err != nil {
			return nil, nil, false, err
		}
		s.Boards[idx].Ships = grid
		s.Placed[idx] = true
		if s.Placed[0] && s.Placed[1] {
			// Both fleets ready — start firing with player 1.
			s.Phase = "play"
			s.Turn = 1
		} else {
			// Hand off to the other player to place their fleet.
			s.Turn = 3 - s.Turn
		}
		newState, _ := json.Marshal(s)
		return newState, nil, false, nil
	}

	// Play phase: fire at the opponent's board.
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

// NextActor maps the engine's internal turn (player number) to a user id so the
// manager keeps current_turn_user_id in sync across both the setup and play
// phases. Returning "" (e.g. the opponent hasn't joined yet) parks the turn until
// they join.
func (BattleshipEngine) NextActor(newState []byte, actorUserID, playerX, playerO string) (string, error) {
	_ = actorUserID
	var s BattleshipState
	if err := json.Unmarshal(newState, &s); err != nil {
		return "", err
	}
	if s.Turn == 2 {
		return playerO, nil
	}
	return playerX, nil
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
