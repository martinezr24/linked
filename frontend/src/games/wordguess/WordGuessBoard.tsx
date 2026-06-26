import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { registerGameRenderer } from "@/games/registry";
import { useTheme } from "@/theme/useTheme";
import type { WordGuessBoardState } from "@/types";

type Props = {
  state: unknown;
  isMyTurn: boolean;
  myPlayerNumber: number;
  onMove: (move: unknown) => void;
  disabled?: boolean;
};

const KEY_ROWS = ["QWERTYUIOP", "ASDFGHJKL", "ZXCVBNM"];

const COLOR_CORRECT = "#4A8C5C";
const COLOR_PRESENT = "#B59A3F";
const COLOR_ABSENT = "#2A2324";
const TILE_EMPTY = "rgba(255,255,255,0.06)";

export function WordGuessBoard({ state, isMyTurn, onMove, disabled }: Props) {
  const theme = useTheme();
  const board = state as WordGuessBoardState;
  const [draft, setDraft] = useState("");

  const { length, maxGuesses, guesses, feedback } = board;
  const locked = disabled || !isMyTurn;

  const fillColor = (status: number) => {
    if (status === 2) return COLOR_CORRECT;
    if (status === 1) return COLOR_PRESENT;
    return COLOR_ABSENT;
  };

  // Best-known status per letter for keyboard tinting.
  const letterStatus: Record<string, number> = {};
  guesses.forEach((g, gi) => {
    g.toUpperCase()
      .split("")
      .forEach((ch, ci) => {
        const s = feedback[gi]?.[ci] ?? 0;
        if ((letterStatus[ch] ?? -1) < s) letterStatus[ch] = s;
      });
  });

  const currentRow = guesses.length;

  const handleKey = (ch: string) => {
    if (locked) return;
    if (draft.length < length) setDraft(draft + ch);
  };
  const handleBackspace = () => {
    if (locked) return;
    setDraft(draft.slice(0, -1));
  };
  const handleSubmit = () => {
    if (locked || draft.length !== length) return;
    onMove({ guess: draft.toLowerCase() });
    setDraft("");
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.grid}>
        {Array.from({ length: maxGuesses }).map((_, row) => {
          const committed = row < guesses.length;
          const isCurrent = row === currentRow && !committed && !locked;
          return (
            <View key={row} style={styles.row}>
              {Array.from({ length }).map((__, col) => {
                let letter = "";
                let bg = TILE_EMPTY;
                let border = "transparent";
                if (committed) {
                  letter = guesses[row][col]?.toUpperCase() ?? "";
                  bg = fillColor(feedback[row]?.[col] ?? 0);
                } else if (isCurrent) {
                  letter = draft[col]?.toUpperCase() ?? "";
                  border =
                    col === draft.length
                      ? theme.colors.text.primary
                      : "rgba(255,255,255,0.18)";
                }
                return (
                  <View
                    key={col}
                    style={[
                      styles.tile,
                      { backgroundColor: bg, borderColor: border },
                    ]}
                  >
                    <AppText style={styles.tileText}>{letter}</AppText>
                  </View>
                );
              })}
            </View>
          );
        })}
      </View>

      <View style={styles.keyboard}>
        {KEY_ROWS.map((kr, i) => (
          <View key={i} style={styles.keyRow}>
            {i === 2 ? (
              <Pressable
                style={[styles.key, styles.wideKey]}
                disabled={locked || draft.length !== length}
                onPress={handleSubmit}
              >
                <AppText style={styles.keyText}>GO</AppText>
              </Pressable>
            ) : null}
            {kr.split("").map((ch) => {
              const s = letterStatus[ch];
              const bg =
                s === undefined
                  ? "#5A6473"
                  : s === 2
                    ? COLOR_CORRECT
                    : s === 1
                      ? COLOR_PRESENT
                      : "#3A3334";
              return (
                <Pressable
                  key={ch}
                  style={[styles.key, { backgroundColor: bg }]}
                  disabled={locked}
                  onPress={() => handleKey(ch)}
                >
                  <AppText style={styles.keyText}>{ch}</AppText>
                </Pressable>
              );
            })}
            {i === 2 ? (
              <Pressable
                style={[styles.key, styles.wideKey]}
                disabled={locked}
                onPress={handleBackspace}
              >
                <AppText style={styles.keyText}>⌫</AppText>
              </Pressable>
            ) : null}
          </View>
        ))}
      </View>
    </View>
  );
}

registerGameRenderer("wordguess", WordGuessBoard);

const styles = StyleSheet.create({
  wrap: { alignItems: "center", gap: 24 },
  grid: { gap: 8 },
  row: { flexDirection: "row", gap: 8 },
  tile: {
    width: 52,
    height: 52,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  tileText: { fontSize: 24, fontFamily: "DMSans_700Bold", color: "#F5F0F1" },
  keyboard: { gap: 8, alignItems: "center" },
  keyRow: { flexDirection: "row", gap: 6 },
  key: {
    minWidth: 30,
    height: 46,
    paddingHorizontal: 6,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  wideKey: { minWidth: 44 },
  keyText: { fontSize: 16, fontFamily: "DMSans_600SemiBold", color: "#F5F0F1" },
});
