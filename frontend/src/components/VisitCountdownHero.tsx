import { Pressable, StyleSheet, View } from "react-native";
import { useEffect } from "react";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";

import { AppText } from "@/components/ui/AppText";
import { ArtifactCard } from "@/components/ui/ArtifactCard";
import { formatLocalDateLabel } from "@/utils/dates";
import { starPath } from "@/utils/sketch";
import { colors } from "@/theme/tokens";

type Props = {
  nextVisitAt: string | null;
  tzLabel: string;
  formatCountdown: (iso: string) => string;
  countdownDays: (iso: string) => string;
  onPress: () => void;
};

// Days-remaining values worth a little celebration.
const MILESTONES = new Set([0, 1, 2, 3, 7]);

type Star = { top: number; left: number; size: number; delay: number; seed: number };
const STARS: Star[] = [
  { top: 2, left: 108, size: 13, delay: 0, seed: 3 },
  { top: 30, left: 140, size: 9, delay: 260, seed: 7 },
  { top: 60, left: 120, size: 15, delay: 120, seed: 11 },
  { top: 14, left: 150, size: 8, delay: 420, seed: 5 },
  { top: 78, left: 150, size: 10, delay: 320, seed: 9 },
];

function TwinkleStar({ top, left, size, delay, seed }: Star) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration: 1300, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      ),
    );
  }, [v, delay]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.3 + v.value * 0.7,
    transform: [{ scale: 0.7 + v.value * 0.5 }],
  }));

  return (
    <Animated.View style={[styles.star, { top, left }, style]}>
      <Svg width={size} height={size}>
        <Path
          d={starPath(size / 2, size / 2, size / 2, size / 4.5, seed)}
          fill={colors.accent.flame}
        />
      </Svg>
    </Animated.View>
  );
}

function MilestoneBurst() {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {STARS.map((s, i) => (
        <TwinkleStar key={i} {...s} />
      ))}
    </View>
  );
}

export function VisitCountdownHero({
  nextVisitAt,
  tzLabel,
  formatCountdown,
  countdownDays,
  onPress,
}: Props) {
  const days = nextVisitAt ? parseInt(countdownDays(nextVisitAt), 10) : NaN;
  const isMilestone = !Number.isNaN(days) && MILESTONES.has(days);

  return (
    <Pressable onPress={onPress} style={styles.wrap}>
      <ArtifactCard category="Visit" title="Next visit" fill style={styles.card}>
        {isMilestone ? <MilestoneBurst /> : null}
        {nextVisitAt ? (
          <>
            <AppText display variant="displayHero" style={styles.days}>
              {countdownDays(nextVisitAt)}
            </AppText>
            <AppText variant="caption" color="secondary" style={styles.label}>
              DAYS UNTIL YOU&apos;RE TOGETHER
            </AppText>
            <AppText variant="body" style={styles.sub}>
              {formatCountdown(nextVisitAt)}
            </AppText>
            <AppText variant="label" color="muted">
              {formatLocalDateLabel(nextVisitAt)} · {tzLabel}
            </AppText>
            <View style={styles.spacer} />
            <AppText variant="caption" color="accent" style={styles.tap}>
              Tap to edit date
            </AppText>
          </>
        ) : (
          <>
            <AppText variant="body" color="muted">
              Set your next visit to start the countdown
            </AppText>
            <View style={styles.spacer} />
            <AppText variant="caption" color="accent" style={styles.tap}>
              Tap to set a date
            </AppText>
          </>
        )}
      </ArtifactCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1 },
  card: { flex: 1, marginBottom: 0 },
  days: { fontFamily: "Fraunces_700Bold", marginBottom: 4 },
  label: { marginBottom: 8 },
  sub: { marginBottom: 6 },
  tap: { marginTop: 12 },
  spacer: { flex: 1, minHeight: 12 },
  star: { position: "absolute" },
});
