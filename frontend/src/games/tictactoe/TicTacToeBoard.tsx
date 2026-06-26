import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { registerGameRenderer } from "@/games/registry";
import { useProfile } from "@/hooks/useProfile";
import type { TicTacToeBoardState } from "@/types";

type Props = {
  state: unknown;
  isMyTurn: boolean;
  myPlayerNumber: number;
  onMove: (move: unknown) => void;
  disabled?: boolean;
};

const CELL = 96;

export function TicTacToeBoard({
  state,
  isMyTurn,
  myPlayerNumber,
  onMove,
  disabled,
}: Props) {
  const board = state as TicTacToeBoardState;
  const { mineColor, partnerColor } = useProfile();

  const mark = (cell: number) => {
    if (cell === 0) return null;
    const mine = cell === myPlayerNumber;
    return (
      <AppText style={[styles.mark, { color: mine ? mineColor : partnerColor }]}>
        {cell === 1 ? "✕" : "○"}
      </AppText>
    );
  };

  return (
    <View style={styles.board}>
      {board.cells.map((cell, i) => (
        <Pressable
          key={i}
          style={styles.cell}
          disabled={disabled || !isMyTurn || cell !== 0}
          onPress={() => onMove({ cell: i })}
        >
          {mark(cell)}
        </Pressable>
      ))}
    </View>
  );
}

registerGameRenderer("tictactoe", TicTacToeBoard);

const styles = StyleSheet.create({
  board: {
    width: CELL * 3,
    flexDirection: "row",
    flexWrap: "wrap",
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "#3C4A5E",
  },
  cell: {
    width: CELL,
    height: CELL,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  mark: { fontSize: 52, fontWeight: "800" },
});
