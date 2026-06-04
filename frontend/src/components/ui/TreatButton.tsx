import { Pressable, StyleSheet } from "react-native";

import { AppText } from "./AppText";
import { hapticLight } from "@/utils/haptics";
import { useTheme } from "@/theme/useTheme";

type Props = {
  onPress: () => void;
};

export function TreatButton({ onPress }: Props) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={() => {
        void hapticLight();
        onPress();
      }}
      style={({ pressed }) => [
        styles.pill,
        {
          backgroundColor: theme.colors.surface.cardElevated,
          borderColor: theme.colors.border.emphasis,
        },
        pressed && styles.pressed,
      ]}
      accessibilityRole="button"
      accessibilityLabel="Treat your partner"
    >
      <AppText variant="caption" style={styles.emoji}>
        🎁
      </AppText>
      <AppText variant="caption" color="accent" style={styles.label}>
        TREAT
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
    borderRadius: 20,
    borderWidth: 1,
  },
  emoji: { fontSize: 12, letterSpacing: 0 },
  label: { letterSpacing: 1 },
  pressed: { opacity: 0.85 },
});
