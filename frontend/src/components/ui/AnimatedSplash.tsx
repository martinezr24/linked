import { useEffect, useState } from "react";
import { Image, StyleSheet, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  Easing,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";

import { useRelationship } from "@/context/RelationshipContext";

// Must match the native splash in app.json (expo-splash-screen) so the handoff
// from the OS splash to this animated overlay is seamless (no flash).
const SPLASH_BG = "#3D1528";
const LOGO = 76; // matches native splash imageWidth

/**
 * Animated app-open splash. Mirrors the native splash, holds briefly, then
 * shrinks + lifts the logo toward the header and fades out — creating the
 * "settles into the navbar" transition. Dismisses when the WebSocket connects,
 * or after a fallback so first-launch / unpaired users still transition.
 */
export function AnimatedSplash() {
  const { subscribe } = useRelationship();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const progress = useSharedValue(0);
  const [done, setDone] = useState(false);

  // From screen center up to roughly where the in-app header logo sits.
  const targetY = -(height / 2 - insets.top - 34);

  useEffect(() => {
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      progress.value = withDelay(
        450,
        withTiming(
          1,
          { duration: 700, easing: Easing.inOut(Easing.cubic) },
          (finished) => {
            if (finished) runOnJS(setDone)(true);
          },
        ),
      );
    };
    const unsub = subscribe((msg) => {
      if (msg.action === "WS_CONNECTED") start();
    });
    const timer = setTimeout(start, 1600);
    return () => {
      unsub();
      clearTimeout(timer);
    };
  }, [subscribe, progress]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.8, 1], [1, 1, 0]),
  }));

  const logoStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [0, targetY]) },
      { scale: interpolate(progress.value, [0, 1], [1, 0.37]) },
    ],
    opacity: interpolate(progress.value, [0, 0.75, 1], [1, 1, 0]),
  }));

  if (done) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.fill, { backgroundColor: SPLASH_BG }, backdropStyle]}
    >
      <Animated.View style={logoStyle}>
        <Image
          source={require("../../../assets/images/splash-icon.png")}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1000,
  },
  logo: { width: LOGO, height: LOGO },
});
