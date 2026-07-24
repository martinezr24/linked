import { StyleSheet } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useEffect } from "react";

import { AppText } from "./AppText";
import { HeartIcon } from "./icons";
import { useTheme } from "@/theme/useTheme";

/**
 * A transient coach-mark that teaches the hidden "hold your partner's avatar to
 * send a heart" gesture. Shown once on first launch and whenever the partner
 * avatar is tapped.
 */
export function HeartHint({ visible }: { visible: boolean }) {
  const theme = useTheme();
  const anim = useSharedValue(0);

  useEffect(() => {
    anim.value = withTiming(visible ? 1 : 0, { duration: 220 });
  }, [visible, anim]);

  const style = useAnimatedStyle(() => ({
    opacity: anim.value,
    transform: [{ translateY: (1 - anim.value) * -6 }],
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.wrap, style]}>
      <Animated.View
        style={[
          styles.pill,
          {
            backgroundColor: theme.colors.surface.cardElevated,
            borderColor: theme.colors.border.emphasis,
          },
        ]}
      >
        <HeartIcon size={13} color={theme.colors.accent.primary} />
        <AppText variant="caption">Hold to send a heart</AppText>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    top: 62,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 20,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
});
