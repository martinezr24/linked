package games

import (
	"encoding/json"
	"errors"
	"math/rand"
	"strings"
)

const WordGuessType = "wordguess"

const wordGuessLength = 5
const wordGuessMaxGuesses = 6

type WordGuessState struct {
	Secret     string   `json:"secret"`
	Length     int      `json:"length"`
	MaxGuesses int      `json:"maxGuesses"`
	Guesses    []string `json:"guesses"`
	Feedback   [][]int  `json:"feedback"` // per guess: 0=absent,1=present,2=correct
	Solved     bool     `json:"solved"`
}

type WordGuessMove struct {
	Guess string `json:"guess"`
}

type WordGuessEngine struct{}

func (WordGuessEngine) Type() string { return WordGuessType }

func (WordGuessEngine) InitialState(playerX, playerO string) ([]byte, error) {
	_ = playerX
	_ = playerO
	secret := wordGuessWords[rand.Intn(len(wordGuessWords))]
	return json.Marshal(WordGuessState{
		Secret:     secret,
		Length:     wordGuessLength,
		MaxGuesses: wordGuessMaxGuesses,
		Guesses:    []string{},
		Feedback:   [][]int{},
	})
}

func (WordGuessEngine) ApplyMove(state []byte, move json.RawMessage, actorUserID, turnUserID string) ([]byte, *string, bool, error) {
	_ = actorUserID
	if turnUserID == "" {
		return nil, nil, false, errors.New("no active turn")
	}
	var s WordGuessState
	if err := json.Unmarshal(state, &s); err != nil {
		return nil, nil, false, err
	}
	if s.Solved || len(s.Guesses) >= s.MaxGuesses {
		return nil, nil, false, errors.New("game already over")
	}
	var m WordGuessMove
	if err := json.Unmarshal(move, &m); err != nil {
		return nil, nil, false, err
	}
	guess := strings.ToLower(strings.TrimSpace(m.Guess))
	if len(guess) != s.Length {
		return nil, nil, false, errors.New("guess must be 5 letters")
	}
	for _, c := range guess {
		if c < 'a' || c > 'z' {
			return nil, nil, false, errors.New("letters only")
		}
	}
	feedback := scoreWordGuess(guess, s.Secret)
	s.Guesses = append(s.Guesses, guess)
	s.Feedback = append(s.Feedback, feedback)

	if guess == s.Secret {
		s.Solved = true
		newState, _ := json.Marshal(s)
		// Collaborative: credit the player who landed the solve. The client
		// frames this as a shared win.
		w := turnUserID
		return newState, &w, false, nil
	}
	if len(s.Guesses) >= s.MaxGuesses {
		newState, _ := json.Marshal(s)
		return newState, nil, true, nil
	}
	newState, _ := json.Marshal(s)
	return newState, nil, false, nil
}

// ViewState hides the secret word from clients until the game is over.
func (WordGuessEngine) ViewState(state []byte, viewerNumber int) ([]byte, error) {
	_ = viewerNumber
	var s WordGuessState
	if err := json.Unmarshal(state, &s); err != nil {
		return nil, err
	}
	if !s.Solved && len(s.Guesses) < s.MaxGuesses {
		s.Secret = ""
	}
	return json.Marshal(s)
}

func scoreWordGuess(guess, secret string) []int {
	result := make([]int, len(guess))
	counts := map[byte]int{}
	for i := 0; i < len(secret); i++ {
		counts[secret[i]]++
	}
	// First pass: exact matches.
	for i := 0; i < len(guess); i++ {
		if guess[i] == secret[i] {
			result[i] = 2
			counts[guess[i]]--
		}
	}
	// Second pass: present-but-misplaced.
	for i := 0; i < len(guess); i++ {
		if result[i] == 2 {
			continue
		}
		if counts[guess[i]] > 0 {
			result[i] = 1
			counts[guess[i]]--
		}
	}
	return result
}

var wordGuessWords = []string{
	"about", "above", "abuse", "actor", "acute", "admit", "adopt", "adult", "agent", "agree",
	"ahead", "alarm", "album", "alert", "alike", "alive", "allow", "alone", "along", "alter",
	"angel", "anger", "angle", "angry", "apart", "apple", "apply", "arena", "argue", "arise",
	"aroma", "array", "aside", "asset", "audio", "audit", "avoid", "award", "aware", "badly",
	"baker", "bases", "basic", "beach", "began", "begin", "being", "below", "bench", "berry",
	"birth", "black", "blame", "blank", "blast", "blend", "bless", "blind", "block", "blood",
	"bloom", "board", "boost", "booth", "bound", "brain", "brand", "brave", "bread", "break",
	"brief", "bring", "broad", "brown", "build", "built", "candy", "cause", "chair", "charm",
	"chase", "cheap", "cheek", "chest", "chief", "child", "chose", "civil", "claim", "class",
	"clean", "clear", "click", "climb", "clock", "close", "cloud", "coach", "coast", "could",
	"count", "court", "cover", "craft", "crash", "crazy", "cream", "crisp", "cross", "crowd",
	"crown", "cycle", "daily", "dance", "dealt", "death", "delay", "dream", "dress", "drink",
	"drive", "early", "earth", "eager", "eaten", "empty", "enjoy", "entry", "equal", "event",
	"every", "exact", "exist", "extra", "faith", "false", "fancy", "fault", "favor", "feast",
	"fever", "fiber", "field", "fifth", "fight", "final", "first", "flame", "flash", "fleet",
	"float", "floor", "flour", "focus", "force", "forth", "found", "frame", "fresh", "front",
	"fruit", "fully", "funny", "ghost", "giant", "given", "glass", "globe", "glory", "grace",
	"grade", "grain", "grand", "grant", "grass", "great", "green", "greet", "group", "grown",
	"guard", "guess", "guest", "guide", "happy", "harsh", "heart", "heavy", "hello", "honey",
	"honor", "horse", "hotel", "house", "human", "humor", "ideal", "image", "index", "inner",
	"input", "issue", "ivory", "jeans", "jewel", "joint", "judge", "juice", "knife", "knock",
	"known", "label", "labor", "large", "laugh", "layer", "learn", "lemon", "level", "light",
	"limit", "linen", "local", "logic", "loose", "lover", "lower", "loyal", "lucky", "lunch",
	"magic", "major", "maker", "march", "match", "maybe", "mayor", "meant", "medal", "media",
	"merit", "metal", "meter", "might", "minor", "model", "money", "month", "moral", "motor",
	"mount", "mouse", "mouth", "movie", "music", "naked", "nerve", "never", "newly", "night",
	"noble", "noise", "north", "novel", "nurse", "ocean", "offer", "olive", "onion", "order",
	"other", "ought", "ounce", "outer", "owner", "paint", "panel", "paper", "party", "patch",
	"peace", "pearl", "phase", "phone", "photo", "piano", "piece", "pilot", "pitch", "place",
	"plain", "plane", "plant", "plate", "point", "porch", "pound", "power", "press", "price",
	"pride", "prime", "print", "prize", "proof", "proud", "prove", "puppy", "queen", "quick",
	"quiet", "quite", "radio", "raise", "ranch", "range", "rapid", "reach", "react", "ready",
	"realm", "rebel", "refer", "relax", "reply", "rider", "ridge", "right", "rival", "river",
	"roast", "robot", "round", "route", "royal", "rugby", "rural", "salad", "sauce", "scale",
	"scene", "scope", "score", "sense", "serve", "seven", "shade", "shake", "shall", "shape",
	"share", "sharp", "sheep", "sheet", "shelf", "shell", "shine", "shirt", "shock", "shore",
	"short", "shown", "sight", "since", "skill", "sleep", "slice", "slide", "small", "smart",
	"smile", "smoke", "snake", "solar", "solid", "solve", "sorry", "sound", "south", "space",
	"spare", "speak", "speed", "spend", "spice", "spine", "spite", "split", "spoke", "sport",
	"spray", "stack", "staff", "stage", "stair", "stake", "stand", "stark", "start", "state",
	"steam", "steel", "steep", "stern", "stick", "still", "stock", "stone", "stood", "store",
	"storm", "story", "stove", "stuck", "study", "stuff", "style", "sugar", "suite", "sunny",
	"super", "sweet", "swift", "swing", "sword", "table", "taken", "tasty", "teach", "tease",
	"thank", "theme", "there", "thick", "thing", "think", "third", "those", "three", "throw",
	"tiger", "tight", "title", "toast", "today", "token", "topic", "total", "touch", "tower",
	"trace", "track", "trade", "trail", "train", "treat", "trend", "trial", "tribe", "trick",
	"truck", "truly", "trust", "truth", "twice", "uncle", "under", "union", "unite", "unity",
	"upper", "upset", "urban", "usage", "usual", "value", "video", "vigor", "vital", "vivid",
	"voice", "vouch", "wagon", "waste", "watch", "water", "weave", "wheat", "wheel", "where",
	"which", "while", "white", "whole", "whose", "woman", "world", "worry", "worth", "would",
	"wound", "write", "wrong", "yacht", "yield", "young", "youth", "zebra",
}
