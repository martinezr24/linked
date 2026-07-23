import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";

import { colors } from "@/theme/tokens";
import { starPath } from "@/utils/sketch";

export const REACTIONS = ["heart", "star", "scribble"] as const;
export type ReactionType = (typeof REACTIONS)[number];

const HEART =
  "M24 40 C 9 28, 4 18, 12 12 C 18 8, 23 13, 24 17 C 25 13, 30 8, 36 12 C 44 18, 39 28, 24 40 Z";
const SCRIBBLE =
  "M5 22 C 9 8, 19 8, 21 19 C 23 30, 33 30, 37 17 C 39 10, 44 12, 44 19";

/** A single hand-drawn sticker reaction (heart, star, or scribble). */
export function ReactionSticker({
  type,
  size = 28,
}: {
  type: ReactionType;
  size?: number;
}) {
  if (type === "heart") {
    return (
      <Svg width={size} height={size} viewBox="0 0 48 44">
        <Path
          d={HEART}
          fill={colors.accent.primary}
          stroke={colors.accent.primary}
          strokeWidth={2}
          strokeLinejoin="round"
        />
      </Svg>
    );
  }
  if (type === "star") {
    return (
      <Svg width={size} height={size} viewBox="0 0 48 48">
        <Path
          d={starPath(24, 24, 20, 8, 23)}
          fill={colors.accent.flame}
          stroke={colors.accent.flame}
          strokeWidth={2}
          strokeLinejoin="round"
        />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 48 36">
      <Path
        d={SCRIBBLE}
        fill="none"
        stroke={colors.accent.success}
        strokeWidth={3}
        strokeLinecap="round"
      />
    </Svg>
  );
}

/**
 * A row of sketch stickers to react to a partner's photo. Tapping the current
 * reaction again clears it.
 */
export function ReactionPicker({
  value,
  onPick,
}: {
  value?: ReactionType | null;
  onPick: (reaction: ReactionType | "") => void;
}) {
  return (
    <View style={styles.row}>
      {REACTIONS.map((type) => {
        const active = value === type;
        return (
          <Pressable
            key={type}
            onPress={() => onPick(active ? "" : type)}
            accessibilityRole="button"
            accessibilityLabel={`React with ${type}`}
            style={[
              styles.slot,
              {
                backgroundColor: active
                  ? "rgba(255,255,255,0.12)"
                  : "transparent",
                borderColor: active
                  ? colors.border.emphasis
                  : colors.border.subtle,
              },
            ]}
          >
            <ReactionSticker type={type} size={26} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "center",
  },
  slot: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
