import { useEffect, useRef } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

import { registerGameRenderer } from "@/games/registry";
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
const STRIDE = DISC_SIZE + GAP;

const BOARD_BG = "#3C4A5E";
const EMPTY_CELL = "rgba(0,0,0,0.28)";

// Classic, fixed Connect 4 colors keyed to the player number so both players
// always see the same disc in the same color regardless of profile colors.
const PLAYER_COLORS: Record<number, string> = {
  1: "#E63946", // red
  2: "#F1C40F", // gold
};

function Disc({ color, dropRows }: { color: string; dropRows: number }) {
  // Initialise at the raised start position so the disc never flashes in its
  // final cell before the drop animation begins.
  const translateY = useSharedValue(dropRows > 0 ? -dropRows * STRIDE : 0);

  useEffect(() => {
    if (dropRows > 0) {
      translateY.value = withSequence(
        withTiming(0, {
          duration: 120 + dropRows * 55,
          easing: Easing.in(Easing.quad),
        }),
        withTiming(-6, { duration: 80, easing: Easing.out(Easing.quad) }),
        withTiming(0, { duration: 110, easing: Easing.in(Easing.quad) }),
      );
    }
    // Only re-run when the drop target changes; translateY is a stable shared value.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dropRows]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      style={[styles.disc, { backgroundColor: color }, animatedStyle]}
    />
  );
}

export function Connect4Board({ state, isMyTurn, onMove, disabled }: Props) {
  const board = state as Connect4BoardState;
  const prevCellsRef = useRef<number[][] | null>(null);

  const colorFor = (cell: number) => {
    if (cell === 0) return EMPTY_CELL;
    return PLAYER_COLORS[cell] ?? EMPTY_CELL;
  };

  // Diff against the previous render to find the single newly-dropped disc so
  // only that one animates into place.
  const prev = prevCellsRef.current;
  let dropRow = -1;
  let dropCol = -1;
  if (prev) {
    let changed = 0;
    for (let r = 0; r < board.rows; r++) {
      for (let c = 0; c < board.cols; c++) {
        const before = prev[r]?.[c] ?? 0;
        const after = board.cells[r]?.[c] ?? 0;
        if (before === 0 && after !== 0) {
          changed++;
          dropRow = r;
          dropCol = c;
        }
      }
    }
    if (changed !== 1) {
      dropRow = -1;
      dropCol = -1;
    }
  }

  useEffect(() => {
    prevCellsRef.current = board.cells.map((row) => [...row]);
  });

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
              const isNew = row === dropRow && col === dropCol;
              return (
                <Disc
                  key={`${row}-${col}-${cell}`}
                  color={colorFor(cell)}
                  dropRows={isNew ? row + 1 : 0}
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
