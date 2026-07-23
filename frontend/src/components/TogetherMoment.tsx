import { useEffect, useRef, useState } from "react";
import { StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

import { AppText } from "@/components/ui/AppText";
import { useRelationship } from "@/context/RelationshipContext";
import { useTheme } from "@/theme/useTheme";
import { starPath } from "@/utils/sketch";
import { hapticLight } from "@/utils/haptics";

/**
 * A rare, quiet celebration: when both partners have the app open at the same
 * moment, a "you're both here right now" pill drifts down and fades away.
 */
export function TogetherMoment() {
  const { bothHere } = useRelationship();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const prev = useRef(false);
  const anim = useSharedValue(0);

  useEffect(() => {
    if (bothHere && !prev.current) {
      setVisible(true);
      void hapticLight();
      anim.value = 0;
      anim.value = withSequence(
        withTiming(1, { duration: 320 }),
        withDelay(
          3200,
          withTiming(0, { duration: 420 }, (finished) => {
            if (finished) runOnJS(setVisible)(false);
          }),
        ),
      );
    }
    prev.current = bothHere;
  }, [bothHere, anim]);

  const style = useAnimatedStyle(() => ({
    opacity: anim.value,
    transform: [{ translateY: (1 - anim.value) * -12 }],
  }));

  if (!visible) return null;

  const star = starPath(7, 7, 6, 2.4, 17);

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.wrap, { top: insets.top + 8 }, style]}
    >
      <Animated.View
        style={[
          styles.pill,
          {
            backgroundColor: theme.colors.surface.cardElevated,
            borderColor: theme.colors.border.emphasis,
          },
        ]}
      >
        <Svg width={14} height={14} viewBox="0 0 14 14">
          <Path d={star} fill={theme.colors.accent.flame} />
        </Svg>
        <AppText variant="bodySemibold">You&apos;re both here right now</AppText>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 1500,
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
});
