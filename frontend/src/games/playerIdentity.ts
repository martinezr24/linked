/** The color/identity that represents a player *within a specific game* — which
 *  is not always their profile/calendar color (e.g. Connect 4 is red/gold). */
export type GameIdentity = { label: string; color: string } | null;

// Fixed, high-contrast game colors so pieces are always legible and consistent
// per-viewer: on each device you are red and your opponent is blue.
export const GAME_YOU_COLOR = "#E63946"; // you (red)
export const GAME_OPPONENT_COLOR = "#5B7FD4"; // opponent (blue)

const CONNECT4 = { 1: "#E63946", 2: "#F1C40F" } as const; // red / gold

export function gameIdentity(
  gameType: string,
  playerNumber: number,
  isMe: boolean,
): GameIdentity {
  if (playerNumber !== 1 && playerNumber !== 2) return null;
  const color = isMe ? GAME_YOU_COLOR : GAME_OPPONENT_COLOR;

  switch (gameType) {
    case "connect4":
      return {
        label: playerNumber === 1 ? "Red" : "Gold",
        color: CONNECT4[playerNumber],
      };
    case "tictactoe":
      return { label: playerNumber === 1 ? "X" : "O", color };
    case "dotsboxes":
      return { label: "", color };
    default:
      // battleship, wordguess: no distinct per-player color.
      return null;
  }
}
