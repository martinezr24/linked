import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { registerGameRenderer } from "@/games/registry";
import { useProfile } from "@/hooks/useProfile";
import type { DotsBoxesBoardState } from "@/types";

type Props = {
  state: unknown;
  isMyTurn: boolean;
  myPlayerNumber: number;
  onMove: (move: unknown) => void;
  disabled?: boolean;
};

const THICK = 12;
const LEN = 40;
const DOT = 9;

const EDGE_EMPTY = "rgba(255,255,255,0.12)";
const EDGE_FULL = "#C9CDD6";

export function DotsBoxesBoard({
  state,
  isMyTurn,
  myPlayerNumber,
  onMove,
  disabled,
}: Props) {
  const board = state as DotsBoxesBoardState;
  const { mineColor, partnerColor } = useProfile();
  const { size, hEdges, vEdges, boxes, scores } = board;
  const locked = disabled || !isMyTurn;

  const colorForPlayer = (p: number) =>
    p === myPlayerNumber ? mineColor : partnerColor;
  const myScore = myPlayerNumber === 2 ? scores[1] : scores[0];
  const theirScore = myPlayerNumber === 2 ? scores[0] : scores[1];

  const placeEdge = (type: "h" | "v", row: number, col: number) => {
    if (locked) return;
    onMove({ type, row, col });
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.scoreRow}>
        <AppText variant="bodySemibold" style={{ color: mineColor }}>
          You {myScore}
        </AppText>
        <AppText variant="bodySemibold" style={{ color: partnerColor }}>
          {theirScore} Partner
        </AppText>
      </View>

      <View>
        {Array.from({ length: size + 1 }).map((_, r) => (
          <View key={`grp-${r}`}>
            {/* dot row with horizontal edges */}
            <View style={styles.line}>
              {Array.from({ length: size }).map((__, c) => (
                <View key={`d-${r}-${c}`} style={styles.lineSeg}>
                  <View style={styles.dotCell}>
                    <View style={styles.dot} />
                  </View>
                  <Pressable
                    style={styles.hEdgeCell}
                    disabled={locked || hEdges[r][c] !== 0}
                    onPress={() => placeEdge("h", r, c)}
                  >
                    <View
                      style={[
                        styles.hEdge,
                        {
                          backgroundColor:
                            hEdges[r][c] !== 0 ? EDGE_FULL : EDGE_EMPTY,
                        },
                      ]}
                    />
                  </Pressable>
                </View>
              ))}
              <View style={styles.dotCell}>
                <View style={styles.dot} />
              </View>
            </View>

            {/* box row with vertical edges */}
            {r < size ? (
              <View style={styles.line}>
                {Array.from({ length: size }).map((__, c) => (
                  <View key={`b-${r}-${c}`} style={styles.lineSeg}>
                    <Pressable
                      style={styles.vEdgeCell}
                      disabled={locked || vEdges[r][c] !== 0}
                      onPress={() => placeEdge("v", r, c)}
                    >
                      <View
                        style={[
                          styles.vEdge,
                          {
                            backgroundColor:
                              vEdges[r][c] !== 0 ? EDGE_FULL : EDGE_EMPTY,
                          },
                        ]}
                      />
                    </Pressable>
                    <View
                      style={[
                        styles.box,
                        boxes[r][c] !== 0
                          ? { backgroundColor: colorForPlayer(boxes[r][c]) }
                          : null,
                      ]}
                    />
                  </View>
                ))}
                <Pressable
                  style={styles.vEdgeCell}
                  disabled={locked || vEdges[r][size] !== 0}
                  onPress={() => placeEdge("v", r, size)}
                >
                  <View
                    style={[
                      styles.vEdge,
                      {
                        backgroundColor:
                          vEdges[r][size] !== 0 ? EDGE_FULL : EDGE_EMPTY,
                      },
                    ]}
                  />
                </Pressable>
              </View>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

registerGameRenderer("dotsboxes", DotsBoxesBoard);

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: 16 },
  scoreRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "80%",
  },
  line: { flexDirection: "row", alignItems: "center" },
  lineSeg: { flexDirection: "row", alignItems: "center" },
  dotCell: {
    width: THICK,
    height: THICK,
    alignItems: "center",
    justifyContent: "center",
  },
  dot: {
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
    backgroundColor: "#8A8F99",
  },
  hEdgeCell: {
    width: LEN,
    height: THICK,
    alignItems: "center",
    justifyContent: "center",
  },
  hEdge: { width: LEN - 4, height: 6, borderRadius: 3 },
  vEdgeCell: {
    width: THICK,
    height: LEN,
    alignItems: "center",
    justifyContent: "center",
  },
  vEdge: { width: 6, height: LEN - 4, borderRadius: 3 },
  box: { width: LEN, height: LEN },
});
