import { StyleSheet, View } from "react-native";
import { type Href, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

import { AppText } from "@/components/ui/AppText";
import { BentoTile } from "@/components/ui/BentoTile";
import { DrawingCanvas } from "@/components/DrawingCanvas";
import { queryKeys } from "@/api/queryKeys";
import { fetchDrawings } from "@/api/fetchers";
import { useRelationship } from "@/context/RelationshipContext";
import { colors } from "@/theme/tokens";

const AnimatedPath = Animated.createAnimatedComponent(Path);

// A hand-drawn heart that draws itself, holds, erases, and repeats — an
// inviting "doodle in progress" for the empty state.
const HEART =
  "M24 39 C 9 28, 4 18, 11.5 12 C 17 7.5, 23 12, 24 16.5 C 25 12, 31 7.5, 36.5 12 C 44 18, 39 28, 24 39 Z";
const HEART_LEN = 138;

function DoodleDrawArt() {
  const offset = useSharedValue(HEART_LEN);

  useEffect(() => {
    offset.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withDelay(2800, withTiming(0, { duration: 0 })),
        withTiming(HEART_LEN, { duration: 700, easing: Easing.in(Easing.ease) }),
        withDelay(700, withTiming(HEART_LEN, { duration: 0 })),
      ),
      -1,
    );
  }, [offset]);

  const pathProps = useAnimatedProps(() => ({
    strokeDashoffset: offset.value,
  }));

  return (
    <Svg width={46} height={42} viewBox="0 0 48 44">
      <AnimatedPath
        d={HEART}
        stroke={colors.accent.primary}
        strokeWidth={2.4}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={HEART_LEN}
        animatedProps={pathProps}
      />
    </Svg>
  );
}

export function DoodlesTile() {
  const { deviceId } = useRelationship();

  const { data: drawings = [] } = useQuery({
    queryKey: queryKeys.drawings,
    queryFn: () => fetchDrawings(deviceId!),
    enabled: Boolean(deviceId),
  });

  const latest = drawings[0];

  return (
    <BentoTile
      category="Doodles"
      accessibilityLabel="Open doodles"
      onPress={() => router.push("/draw" as Href)}
    >
      {latest ? (
        <View style={styles.previewClip}>
          <DrawingCanvas data={latest.data} />
        </View>
      ) : (
        <View style={styles.placeholder}>
          <DoodleDrawArt />
          <AppText variant="caption" color="muted" style={styles.hint}>
            Tap to draw
          </AppText>
        </View>
      )}
    </BentoTile>
  );
}

const styles = StyleSheet.create({
  previewClip: {
    flex: 1,
    borderRadius: 10,
    overflow: "hidden",
    justifyContent: "center",
  },
  placeholder: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  hint: { marginTop: 2 },
});
