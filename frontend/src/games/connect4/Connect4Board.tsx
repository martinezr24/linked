import { Pressable, StyleSheet, View } from "react-native";

import { registerGameRenderer } from "@/games/registry";
import { useProfile } from "@/hooks/useProfile";
import type { Connect4BoardState } from "@/types";

type Props = {
  state: unknown;
  isMyTurn: boolean;
  myPlayerNumber: number;
  onMove: (move: unknown) => void;
  disabled?: boolean;
};

const DISC_SIZE = 38;
const GAP = 8;

const BOARD_BG = "#3C4A5E";
const EMPTY_CELL = "rgba(0,0,0,0.28)";

export function Connect4Board({
  state,
  isMyTurn,
  myPlayerNumber,
  onMove,
  disabled,
}: Props) {
  const board = state as Connect4BoardState;
  const { mineColor, partnerColor } = useProfile();
  const colorFor = (cell: number) => {
    if (cell === 0) return EMPTY_CELL;
    if (cell === myPlayerNumber) return mineColor;
    return partnerColor;
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.board}>
        {Array.from({ length: board.cols }).map((_, col) => (
          <Pressable
            key={col}
            style={styles.columnTap}
            disabled={disabled || !isMyTurn}
            onPress={() => onMove({ column: col })}
          >
            {Array.from({ length: board.rows }).map((__, row) => {
              const cell = board.cells[row]?.[col] ?? 0;
              return (
                <View
                  key={`${row}-${col}`}
                  style={[styles.disc, { backgroundColor: colorFor(cell) }]}
                />
              );
            })}
          </Pressable>
        ))}
      </View>
    </View>
  );
}

registerGameRenderer("connect4", Connect4Board);

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: 12 },
  board: {
    flexDirection: "row",
    gap: GAP,
    padding: 14,
    borderRadius: 20,
    backgroundColor: BOARD_BG,
  },
  columnTap: {
    gap: GAP,
    alignItems: "center",
  },
  disc: {
    width: DISC_SIZE,
    height: DISC_SIZE,
    borderRadius: DISC_SIZE / 2,
  },
});
