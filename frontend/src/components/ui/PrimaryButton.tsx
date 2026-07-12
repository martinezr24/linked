import { LinearGradient } from "expo-linear-gradient";
import {
  ActivityIndicator,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { AppText } from "./AppText";
import { PressableScale } from "./motion";
import { useTheme } from "@/theme/useTheme";

type Props = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  variant?: "primary" | "ghost";
};

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  style,
  variant = "primary",
}: Props) {
  const theme = useTheme();
  const isDisabled = disabled || loading;

  if (variant === "ghost") {
    return (
      <PressableScale
        onPress={onPress}
        disabled={isDisabled}
        style={[
          styles.ghost,
          { borderColor: theme.colors.border.subtle },
          isDisabled && styles.ghostDisabled,
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={theme.colors.text.primary} />
        ) : (
          <AppText variant="bodySemibold">{label}</AppText>
        )}
      </PressableScale>
    );
  }

  if (isDisabled) {
    return (
      <View style={[styles.wrap, style]}>
        <View
          style={[
            styles.disabledSurface,
            { backgroundColor: theme.colors.surface.cardElevated },
          ]}
        >
          {loading ? (
            <ActivityIndicator color={theme.colors.text.muted} />
          ) : (
            <AppText variant="bodySemibold" color="muted">
              {label}
            </AppText>
          )}
        </View>
      </View>
    );
  }

  return (
    <PressableScale onPress={onPress} style={[styles.wrap, style]}>
      <LinearGradient
        colors={[theme.colors.accent.primary, theme.colors.accent.primaryMuted]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <AppText
          variant="bodySemibold"
          style={{
            color: theme.colors.text.onAccent,
            fontFamily: "DMSans_700Bold",
          }}
        >
          {label}
        </AppText>
      </LinearGradient>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 999,
    overflow: "hidden",
  },
  gradient: {
    paddingVertical: 15,
    paddingHorizontal: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledSurface: {
    paddingVertical: 15,
    paddingHorizontal: 22,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.07)",
  },
  ghost: {
    paddingVertical: 15,
    paddingHorizontal: 22,
    alignItems: "center",
    borderRadius: 999,
    borderWidth: 1,
  },
  ghostDisabled: { opacity: 0.45 },
});
