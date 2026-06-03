import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { AppText } from "./AppText";
import { useTheme } from "@/theme/useTheme";

type Props = {
  children: React.ReactNode;
  category?: string;
  title?: string;
  stacked?: boolean;
  featured?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function ArtifactCard({
  children,
  category,
  title,
  stacked = false,
  featured = false,
  style,
}: Props) {
  const theme = useTheme();

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
      <View
        style={[
          styles.card,
          {
            backgroundColor: theme.colors.surface.card,
            borderColor: featured
              ? theme.colors.border.emphasis
              : theme.colors.border.subtle,
          },
          featured && styles.featured,
          theme.shadow.card,
        ]}
      >
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
      </View>
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
    borderRadius: 16,
    borderWidth: 1,
  },
  stackLayer2: {
    position: "absolute",
    left: 3,
    right: -3,
    top: 3,
    bottom: -3,
    borderRadius: 16,
    borderWidth: 1,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    position: "relative",
  },
  featured: {
    borderWidth: 1.5,
  },
  category: {
    marginBottom: 8,
  },
  title: {
    marginBottom: 12,
  },
});
