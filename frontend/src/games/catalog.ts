import type { GridGame } from "@/types";

export type GameResultContext = {
  game: GridGame;
  partnerName: string;
};

export type GameMeta = {
  type: string;
  title: string;
  subtitle: string;
  emoji: string;
  /** Grid games use the shared engine; trivia uses its own system. */
  kind: "grid" | "trivia";
  route: string;
  /** Custom finished-state message. Falls back to win/lose/draw. */
  getResult?: (ctx: GameResultContext) => string;
};

function defaultResult({ game, partnerName }: GameResultContext): string {
  if (!game.winnerUserId) return "It's a draw!";
  const iWon =
    (game.myPlayerNumber === 1 && game.winnerUserId === game.playerXUserId) ||
    (game.myPlayerNumber === 2 &&
      !!game.playerOUserId &&
      game.winnerUserId === game.playerOUserId);
  return iWon ? "You win! 🎉" : `${partnerName} wins!`;
}

export const GAMES: GameMeta[] = [
  {
    type: "connect4",
    title: "Connect 4",
    subtitle: "Drop discs, line up four in a row.",
    emoji: "🔴",
    kind: "grid",
    route: "/games/connect4",
  },
  {
    type: "tictactoe",
    title: "Tic-Tac-Toe",
    subtitle: "Three in a row, classic and quick.",
    emoji: "⭕️",
    kind: "grid",
    route: "/games/tictactoe",
  },
  {
    type: "wordguess",
    title: "Word Guess",
    subtitle: "Crack today's 5-letter word together.",
    emoji: "🔤",
    kind: "grid",
    route: "/games/wordguess",
    getResult: ({ game }) =>
      game.winnerUserId ? "Solved together! 🎉" : "Out of guesses — try again tomorrow.",
  },
  {
    type: "dotsboxes",
    title: "Dots & Boxes",
    subtitle: "Close boxes to claim the board.",
    emoji: "▦",
    kind: "grid",
    route: "/games/dotsboxes",
  },
  {
    type: "battleship",
    title: "Battleship",
    subtitle: "Hunt and sink each other's fleet.",
    emoji: "🚢",
    kind: "grid",
    route: "/games/battleship",
  },
  {
    type: "trivia",
    title: "Trivia",
    subtitle: "Ask questions only you two would know.",
    emoji: "❓",
    kind: "trivia",
    route: "/games/trivia",
  },
];

export function getGameMeta(type: string): GameMeta | undefined {
  return GAMES.find((g) => g.type === type);
}

export function resolveResult(ctx: GameResultContext): string {
  const meta = getGameMeta(ctx.game.gameType);
  return meta?.getResult ? meta.getResult(ctx) : defaultResult(ctx);
}

export type GameOutcome = "win" | "lose" | "draw";

export function resolveOutcome(game: GridGame): GameOutcome {
  if (!game.winnerUserId) return "draw";
  const iWon =
    (game.myPlayerNumber === 1 && game.winnerUserId === game.playerXUserId) ||
    (game.myPlayerNumber === 2 &&
      !!game.playerOUserId &&
      game.winnerUserId === game.playerOUserId);
  return iWon ? "win" : "lose";
}
