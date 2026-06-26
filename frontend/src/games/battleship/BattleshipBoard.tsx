import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { registerGameRenderer } from "@/games/registry";
import { useTheme } from "@/theme/useTheme";
import type { BattleshipBoardState } from "@/types";

type Props = {
  state: unknown;
  isMyTurn: boolean;
  myPlayerNumber: number;
  onMove: (move: unknown) => void;
  disabled?: boolean;
};

const CELL = 26;
const GAP = 2;

const WATER = "rgba(255,255,255,0.06)";
const SHIP = "#5A6473";

export function BattleshipBoard({
  state,
  isMyTurn,
  myPlayerNumber,
  onMove,
  disabled,
}: Props) {
  const theme = useTheme();
  const board = state as BattleshipBoardState;
  const { size, boards } = board;
  const locked = disabled || !isMyTurn;

  const myIdx = myPlayerNumber === 2 ? 1 : 0;
  const oppIdx = myIdx === 0 ? 1 : 0;
  const mine = boards[myIdx];
  const enemy = boards[oppIdx];

  const hit = theme.colors.accent.primary;
  const miss = "rgba(255,255,255,0.28)";

  const fire = (r: number, c: number) => {
    if (locked) return;
    if (enemy.shots[r][c] !== 0) return;
    onMove({ row: r, col: c });
  };

  const renderGrid = (
    label: string,
    cells: (r: number, c: number) => React.ReactNode,
    onCell?: (r: number, c: number) => void,
  ) => (
    <View style={styles.gridBlock}>
      <AppText variant="label" color="secondary" style={styles.gridLabel}>
        {label}
      </AppText>
      <View style={styles.grid}>
        {Array.from({ length: size }).map((_, r) => (
          <View key={r} style={styles.gridRow}>
            {Array.from({ length: size }).map((__, c) => (
              <Pressable
                key={c}
                disabled={!onCell || locked}
                onPress={() => onCell?.(r, c)}
                style={styles.cellTap}
              >
                {cells(r, c)}
              </Pressable>
            ))}
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <View style={styles.wrap}>
      {renderGrid(
        "ENEMY WATERS — TAP TO FIRE",
        (r, c) => {
          const shot = enemy.shots[r][c];
          const bg = shot === 2 ? hit : WATER;
          return (
            <View style={[styles.cell, { backgroundColor: bg }]}>
              {shot === 1 ? <View style={[styles.dot, { backgroundColor: miss }]} /> : null}
            </View>
          );
        },
        fire,
      )}

      {renderGrid("YOUR FLEET", (r, c) => {
        const ship = mine.ships[r][c] > 0;
        const shot = mine.shots[r][c];
        let bg = WATER;
        if (ship && shot === 2) bg = hit;
        else if (ship) bg = SHIP;
        return (
          <View style={[styles.cell, { backgroundColor: bg }]}>
            {!ship && shot === 1 ? (
              <View style={[styles.dot, { backgroundColor: miss }]} />
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

registerGameRenderer("battleship", BattleshipBoard);

const styles = StyleSheet.create({
  wrap: { gap: 20, alignItems: "center" },
  gridBlock: { gap: 8, alignItems: "center" },
  gridLabel: { textAlign: "center" },
  grid: {
    padding: 6,
    borderRadius: 14,
    backgroundColor: "#26303D",
    gap: GAP,
  },
  gridRow: { flexDirection: "row", gap: GAP },
  cellTap: {},
  cell: {
    width: CELL,
    height: CELL,
    borderRadius: 5,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
