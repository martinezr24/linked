import { Pressable, StyleSheet } from "react-native";
import { type Href, router } from "expo-router";

import { AppText } from "./AppText";
import { FlameIcon } from "./FlameIcon";
import { useTheme } from "@/theme/useTheme";

type Props = {
  count: number;
};

export function StreakPill({ count }: Props) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={() => router.push("/streak" as Href)}
      style={({ pressed }) => [
        styles.pill,
        {
          backgroundColor: theme.colors.surface.cardElevated,
          borderColor: theme.colors.border.subtle,
        },
        pressed && styles.pressed,
      ]}
    >
      <FlameIcon
        size={14}
        outer={theme.colors.accent.flame}
        inner={theme.colors.accent.flameInner}
      />
      <AppText variant="bodySemibold" style={styles.count}>
        {count}
      </AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  count: {
    fontFamily: "DMSans_700Bold",
    minWidth: 12,
    textAlign: "center",
  },
  pressed: { opacity: 0.8 },
});
