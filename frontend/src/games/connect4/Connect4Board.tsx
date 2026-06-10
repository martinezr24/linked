import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { useProfile } from "@/hooks/useProfile";
import type { Connect4BoardState } from "@/types";

type Props = {
  state: Connect4BoardState;
  isMyTurn: boolean;
  myPlayerNumber: number;
  onColumnPress: (column: number) => void;
  disabled?: boolean;
};

const DISC_SIZE = 36;
const GAP = 6;

export function Connect4Board({
  state,
  isMyTurn,
  myPlayerNumber,
  onColumnPress,
  disabled,
}: Props) {
  const { mineColor, partnerColor } = useProfile();
  const colorFor = (cell: number) => {
    if (cell === 0) return "rgba(255,255,255,0.08)";
    if (cell === myPlayerNumber) return mineColor;
    return partnerColor;
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.columns}>
        {Array.from({ length: state.cols }).map((_, col) => (
          <Pressable
            key={col}
            style={styles.columnTap}
            disabled={disabled || !isMyTurn}
            onPress={() => onColumnPress(col)}
          >
            {Array.from({ length: state.rows }).map((__, row) => {
              const cell = state.cells[row]?.[col] ?? 0;
              return (
                <View
                  key={`${row}-${col}`}
                  style={[
                    styles.disc,
                    { backgroundColor: colorFor(cell) },
                  ]}
                />
              );
            })}
          </Pressable>
        ))}
      </View>
      {!isMyTurn && !disabled ? (
        <AppText variant="body" color="secondary" style={styles.hint}>
          Waiting for partner&apos;s move…
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: 12 },
  columns: {
    flexDirection: "row",
    gap: GAP,
    padding: 12,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.04)",
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
  hint: { textAlign: "center" },
});
