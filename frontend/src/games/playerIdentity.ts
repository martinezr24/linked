/** The color/identity that represents a player *within a specific game* — which
 *  is not always their profile/calendar color (e.g. Connect 4 is red/gold). */
export type GameIdentity = { label: string; color: string } | null;

const CONNECT4 = { 1: "#E63946", 2: "#F1C40F" } as const; // red / gold

export function gameIdentity(
  gameType: string,
  playerNumber: number,
  isMe: boolean,
  mineColor: string,
  partnerColor: string,
): GameIdentity {
  if (playerNumber !== 1 && playerNumber !== 2) return null;
  const profileColor = isMe ? mineColor : partnerColor;

  switch (gameType) {
    case "connect4":
      return {
        label: playerNumber === 1 ? "Red" : "Gold",
        color: CONNECT4[playerNumber],
      };
    case "tictactoe":
      return { label: playerNumber === 1 ? "X" : "O", color: profileColor };
    case "dotsboxes":
      return { label: "", color: profileColor };
    default:
      // battleship, wordguess: no distinct per-player color.
      return null;
  }
}
