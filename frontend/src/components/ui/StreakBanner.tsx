import { Pressable, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

import { AppText } from "./AppText";
import { FlameIcon } from "./FlameIcon";
import { CloseIcon, HeartIcon } from "./icons";
import { useTheme } from "@/theme/useTheme";

type Props = {
  title: string;
  subtitle?: string;
  /** "success" = streak secured (warm gradient + heart), "pending" = waiting. */
  variant?: "success" | "pending";
  /** When provided, shows a dismiss (X) control. */
  onDismiss?: () => void;
};

/** Premium status banner used for daily photo / check-in streak moments. */
export function StreakBanner({ title, subtitle, variant = "success", onDismiss }: Props) {
  const theme = useTheme();
  const success = variant === "success";

  return (
    <LinearGradient
      colors={
        success
          ? ["rgba(230,57,70,0.20)", "rgba(230,57,70,0.05)"]
          : ["rgba(255,255,255,0.05)", "rgba(255,255,255,0.02)"]
      }
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.banner,
        {
          borderColor: success
            ? theme.colors.border.emphasis
            : theme.colors.border.subtle,
        },
      ]}
    >
      <View
        style={[
          styles.iconChip,
          {
            backgroundColor: success
              ? "rgba(230,57,70,0.14)"
              : "rgba(255,255,255,0.06)",
          },
        ]}
      >
        <FlameIcon
          size={22}
          outer={theme.colors.accent.flame}
          inner={theme.colors.accent.flameInner}
        />
      </View>
      <View style={styles.text}>
        <AppText variant="bodySemibold" color={success ? "accent" : "primary"}>
          {title}
        </AppText>
        {subtitle ? (
          <AppText variant="caption" color="secondary">
            {subtitle}
          </AppText>
        ) : null}
      </View>
      {onDismiss ? (
        <Pressable
          onPress={onDismiss}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Dismiss"
        >
          <CloseIcon size={16} color={theme.colors.text.muted} />
        </Pressable>
      ) : success ? (
        <HeartIcon size={16} color={theme.colors.accent.primary} />
      ) : null}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  iconChip: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  text: { flex: 1, gap: 2 },
});
