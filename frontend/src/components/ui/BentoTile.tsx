import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { PressableScale } from "@/components/ui/motion";
import { colors } from "@/theme/tokens";

type Props = {
  onPress: () => void;
  accessibilityLabel: string;
  category?: string;
  style?: StyleProp<ViewStyle>;
  children?: React.ReactNode;
};

/**
 * Compact pressable tile for the Bento grid. Matches ArtifactCard styling
 * (surface card, subtle border, radius 20) and fills its column height so it
 * can sit beside a taller hero card. Springs on press via reanimated.
 */
export function BentoTile({
  onPress,
  accessibilityLabel,
  category,
  style,
  children,
}: Props) {
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[styles.tile, style]}
    >
      {category ? (
        <AppText variant="label" color="secondary" style={styles.category}>
          {category.toUpperCase()}
        </AppText>
      ) : null}
      <View style={styles.content}>{children}</View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minHeight: 96,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.card,
    padding: 16,
    overflow: "hidden",
  },
  category: { marginBottom: 8 },
  content: { flex: 1 },
});
