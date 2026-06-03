import { Pressable, StyleSheet } from "react-native";

import { AppText } from "./AppText";
import { useTheme } from "@/theme/useTheme";

type Props = {
  onPress: () => void;
};

export function PromptShuffleButton({ onPress }: Props) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        {
          backgroundColor: theme.colors.surface.cardElevated,
          borderColor: theme.colors.border.subtle,
        },
        pressed && styles.pressed,
      ]}
    >
      <AppText variant="body" color="secondary">
        Feeling spontaneous?{" "}
      </AppText>
      <AppText variant="bodySemibold" color="accent">
        Shuffle prompt
      </AppText>
      <AppText style={styles.dice}> 🎲</AppText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
  },
  dice: { fontSize: 16 },
  pressed: { opacity: 0.85 },
});
