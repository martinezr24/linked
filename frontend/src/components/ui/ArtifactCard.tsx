import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { AppText } from "./AppText";
import { PressableScale } from "./motion";
import { SketchFrame } from "./SketchFrame";
import { useTheme } from "@/theme/useTheme";

type Props = {
  children: React.ReactNode;
  category?: string;
  title?: string;
  stacked?: boolean;
  featured?: boolean;
  style?: StyleProp<ViewStyle>;
  /** When provided, the whole card becomes a spring-pressable button. */
  onPress?: () => void;
  accessibilityLabel?: string;
};

export function ArtifactCard({
  children,
  category,
  title,
  stacked = false,
  featured = false,
  style,
  onPress,
  accessibilityLabel,
}: Props) {
  const theme = useTheme();

  const cardStyle = [
    styles.card,
    {
      // Featured cards get a hand-drawn SketchFrame outline (below) instead of
      // a border, so the card itself is borderless and subtly lifted.
      backgroundColor: featured
        ? theme.colors.surface.cardElevated
        : theme.colors.surface.card,
      borderColor: featured ? "transparent" : theme.colors.border.subtle,
    },
    theme.shadow.card,
  ];

  const inner = (
    <>
      {category ? (
        <AppText variant="label" color="secondary" style={styles.category}>
          {category.toUpperCase()}
        </AppText>
      ) : null}
      {title ? (
        <AppText variant="h2" style={styles.title}>
          {title}
        </AppText>
      ) : null}
      {children}
    </>
  );

  const cardEl = onPress ? (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={cardStyle}
    >
      {inner}
    </PressableScale>
  ) : (
    <View style={cardStyle}>{inner}</View>
  );

  return (
    <View style={[styles.wrap, style]}>
      {stacked ? (
        <>
          <View
            style={[
              styles.stackLayer,
              {
                backgroundColor: theme.colors.surface.cardElevated,
                borderColor: theme.colors.border.subtle,
              },
            ]}
          />
          <View
            style={[
              styles.stackLayer2,
              {
                backgroundColor: theme.colors.surface.card,
                borderColor: theme.colors.border.subtle,
              },
            ]}
          />
        </>
      ) : null}
      {featured ? <SketchFrame>{cardEl}</SketchFrame> : cardEl}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "relative",
    marginBottom: 16,
  },
  stackLayer: {
    position: "absolute",
    left: 6,
    right: -6,
    top: 6,
    bottom: -6,
    borderRadius: 20,
    borderWidth: 1,
  },
  stackLayer2: {
    position: "absolute",
    left: 3,
    right: -3,
    top: 3,
    bottom: -3,
    borderRadius: 20,
    borderWidth: 1,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    position: "relative",
  },
  category: {
    marginBottom: 8,
  },
  title: {
    marginBottom: 12,
  },
});
