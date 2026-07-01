import { StyleSheet, View } from "react-native";
import { type Href, router } from "expo-router";

import { AppText } from "@/components/ui/AppText";
import { BentoTile } from "@/components/ui/BentoTile";
import { TabGamesIcon } from "@/components/ui/TabIcons";
import { colors } from "@/theme/tokens";

export function PlayTile() {
  return (
    <BentoTile
      category="Play"
      accessibilityLabel="Open games"
      onPress={() => router.push("/games" as Href)}
    >
      <View style={styles.body}>
        <TabGamesIcon size={26} color={colors.accent.primary} />
        <View>
          <AppText variant="bodySemibold">Mini games</AppText>
          <AppText variant="caption" color="muted">
            Play together
          </AppText>
        </View>
      </View>
    </BentoTile>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    justifyContent: "flex-end",
    gap: 8,
  },
});
