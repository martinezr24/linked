import {
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { AppText } from "@/components/ui/AppText";
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
 * (surface card, subtle border, radius 16) and fills its column height so it
 * can sit beside a taller hero card.
 */
export function BentoTile({
  onPress,
  accessibilityLabel,
  category,
  style,
  children,
}: Props) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed, style]}
    >
      {category ? (
        <AppText variant="label" color="secondary" style={styles.category}>
          {category.toUpperCase()}
        </AppText>
      ) : null}
      <View style={styles.content}>{children}</View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minHeight: 96,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.card,
    padding: 14,
    overflow: "hidden",
  },
  pressed: { opacity: 0.85 },
  category: { marginBottom: 8 },
  content: { flex: 1 },
});
