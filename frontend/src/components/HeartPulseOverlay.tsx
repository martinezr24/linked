import { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { HeartIcon } from "@/components/ui/icons";
import { useRelationship } from "@/context/RelationshipContext";
import { colors } from "@/theme/tokens";
import { hapticSuccess } from "@/utils/haptics";

/**
 * Full-screen heart ripple that plays when a "thinking of you" pulse arrives —
 * either optimistically when you send one, or over the websocket when your
 * partner does. A short dedupe window keeps the sender's optimistic play from
 * doubling up with the server's echo of the same pulse.
 */
export function HeartPulseOverlay() {
  const { subscribe } = useRelationship();
  const [playing, setPlaying] = useState(false);
  const progress = useSharedValue(0);
  const lastPlayedRef = useRef(0);

  useEffect(() => {
    return subscribe((msg) => {
      if (msg.action !== "PULSE") return;
      const now = Date.now();
      if (now - lastPlayedRef.current < 2000) return;
      lastPlayedRef.current = now;
      void hapticSuccess();
      setPlaying(true);
      progress.value = 0;
      progress.value = withTiming(
        1,
        { duration: 1500, easing: Easing.out(Easing.cubic) },
        (finished) => {
          if (finished) runOnJS(setPlaying)(false);
        },
      );
    });
  }, [subscribe, progress]);

  const heartStyle = useAnimatedStyle(() => {
    const p = progress.value;
    const scale = 0.4 + p * 1.6;
    const opacity = p < 0.15 ? p / 0.15 : 1 - (p - 0.15) / 0.85;
    return { opacity, transform: [{ scale }] };
  });

  const ringStyle = useAnimatedStyle(() => {
    const p = progress.value;
    return {
      opacity: (1 - p) * 0.5,
      transform: [{ scale: 0.3 + p * 2.6 }],
    };
  });

  if (!playing) return null;

  return (
    <View pointerEvents="none" style={styles.wrap}>
      <Animated.View style={[styles.ring, ringStyle]} />
      <Animated.View style={heartStyle}>
        <HeartIcon size={140} color={colors.accent.primary} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2000,
  },
  ring: {
    position: "absolute",
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 3,
    borderColor: colors.accent.primary,
  },
});
