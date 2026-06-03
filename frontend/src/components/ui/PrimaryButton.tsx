import { LinearGradient } from "expo-linear-gradient";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { AppText } from "./AppText";
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
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        style={({ pressed }) => [
          styles.ghost,
          { borderColor: theme.colors.border.subtle },
          pressed && styles.pressed,
          isDisabled && styles.disabled,
          style,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={theme.colors.text.primary} />
        ) : (
          <AppText variant="bodySemibold">{label}</AppText>
        )}
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.wrap,
        pressed && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      <LinearGradient
        colors={[theme.colors.accent.primary, theme.colors.accent.primaryMuted]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        {loading ? (
          <ActivityIndicator color={theme.colors.text.onAccent} />
        ) : (
          <AppText
            variant="bodySemibold"
            style={{ color: theme.colors.text.onAccent, fontFamily: "DMSans_700Bold" }}
          >
            {label}
          </AppText>
        )}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 12,
    overflow: "hidden",
  },
  gradient: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  ghost: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center",
    borderRadius: 12,
    borderWidth: 1,
  },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.45 },
});
