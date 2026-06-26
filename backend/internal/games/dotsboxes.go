package games

import (
	"encoding/json"
	"errors"
)

const DotsBoxesType = "dotsboxes"

const dotsBoxesSize = 5 // 5x5 boxes => 6x6 dots

type DotsBoxesState struct {
	Size    int     `json:"size"`
	HEdges  [][]int `json:"hEdges"` // (size+1) rows x size cols
	VEdges  [][]int `json:"vEdges"` // size rows x (size+1) cols
	Boxes   [][]int `json:"boxes"`  // size x size: 0 empty, 1 or 2 owner
	Turn    int     `json:"turn"`   // current player number (1 or 2)
	Scores  [2]int  `json:"scores"`
	PlayerX string  `json:"-"`
	PlayerO string  `json:"-"`
}

// playerXO is persisted so the engine can resolve the winning user id once the
// board is full (the final mover is not necessarily the winner).
type dotsBoxesPersist struct {
	DotsBoxesState
	PX string `json:"px"`
	PO string `json:"po"`
}

type DotsBoxesMove struct {
	Type string `json:"type"` // "h" or "v"
	Row  int    `json:"row"`
	Col  int    `json:"col"`
}

type DotsBoxesEngine struct{}

func (DotsBoxesEngine) Type() string { return DotsBoxesType }

func (DotsBoxesEngine) InitialState(playerX, playerO string) ([]byte, error) {
	n := dotsBoxesSize
	h := make([][]int, n+1)
	for r := range h {
		h[r] = make([]int, n)
	}
	v := make([][]int, n)
	for r := range v {
		v[r] = make([]int, n+1)
	}
	boxes := make([][]int, n)
	for r := range boxes {
		boxes[r] = make([]int, n)
	}
	p := dotsBoxesPersist{
		DotsBoxesState: DotsBoxesState{
			Size:   n,
			HEdges: h,
			VEdges: v,
			Boxes:  boxes,
			Turn:   1,
		},
		PX: playerX,
		PO: playerO,
	}
	return json.Marshal(p)
}

func (DotsBoxesEngine) ApplyMove(state []byte, move json.RawMessage, actorUserID, turnUserID string) ([]byte, *string, bool, error) {
	if turnUserID == "" {
		return nil, nil, false, errors.New("no active turn")
	}
	var p dotsBoxesPersist
	if err := json.Unmarshal(state, &p); err != nil {
		return nil, nil, false, err
	}
	n := p.Size
	// Record the user id for the acting player number (mover number == Turn).
	if p.Turn == 1 {
		p.PX = actorUserID
	} else {
		p.PO = actorUserID
	}
	var m DotsBoxesMove
	if err := json.Unmarshal(move, &m); err != nil {
		return nil, nil, false, err
	}
	switch m.Type {
	case "h":
		if m.Row < 0 || m.Row > n || m.Col < 0 || m.Col >= n {
			return nil, nil, false, errors.New("invalid edge")
		}
		if p.HEdges[m.Row][m.Col] != 0 {
			return nil, nil, false, errors.New("edge taken")
		}
		p.HEdges[m.Row][m.Col] = 1
	case "v":
		if m.Row < 0 || m.Row >= n || m.Col < 0 || m.Col > n {
			return nil, nil, false, errors.New("invalid edge")
		}
		if p.VEdges[m.Row][m.Col] != 0 {
			return nil, nil, false, errors.New("edge taken")
		}
		p.VEdges[m.Row][m.Col] = 1
	default:
		return nil, nil, false, errors.New("invalid move type")
	}

	claimed := 0
	for br := 0; br < n; br++ {
		for bc := 0; bc < n; bc++ {
			if p.Boxes[br][bc] != 0 {
				continue
			}
			if p.HEdges[br][bc] != 0 && p.HEdges[br+1][bc] != 0 &&
				p.VEdges[br][bc] != 0 && p.VEdges[br][bc+1] != 0 {
				p.Boxes[br][bc] = p.Turn
				p.Scores[p.Turn-1]++
				claimed++
			}
		}
	}

	if claimed == 0 {
		if p.Turn == 1 {
			p.Turn = 2
		} else {
			p.Turn = 1
		}
	}

	if p.Scores[0]+p.Scores[1] >= n*n {
		newState, _ := json.Marshal(p)
		if p.Scores[0] > p.Scores[1] {
			w := p.PX
			return newState, &w, false, nil
		}
		if p.Scores[1] > p.Scores[0] {
			w := p.PO
			return newState, &w, false, nil
		}
		return newState, nil, true, nil
	}

	newState, _ := json.Marshal(p)
	return newState, nil, false, nil
}

func (DotsBoxesEngine) NextActor(newState []byte, actorUserID, playerX, playerO string) (string, error) {
	_ = actorUserID
	var s struct {
		Turn int `json:"turn"`
	}
	if err := json.Unmarshal(newState, &s); err != nil {
		return "", err
	}
	if s.Turn == 1 {
		return playerX, nil
	}
	return playerO, nil
}
