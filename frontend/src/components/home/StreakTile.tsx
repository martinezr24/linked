import { StyleSheet, View } from "react-native";
import { type Href, router } from "expo-router";

import { AppText } from "@/components/ui/AppText";
import { BentoTile } from "@/components/ui/BentoTile";
import { FlameIcon } from "@/components/ui/FlameIcon";

type Props = {
  streak: number;
};

export function StreakTile({ streak }: Props) {
  return (
    <BentoTile
      category="Streak"
      accessibilityLabel="Open streak"
      onPress={() => router.push("/streak" as Href)}
    >
      <View style={styles.body}>
        <View style={styles.countRow}>
          <FlameIcon size={22} />
          <AppText variant="h2">{streak}</AppText>
        </View>
        <AppText variant="caption" color="muted">
          day streak
        </AppText>
      </View>
    </BentoTile>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    justifyContent: "flex-end",
    gap: 4,
  },
  countRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});
