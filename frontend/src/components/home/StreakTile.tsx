import { useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";
import { type Href, router } from "expo-router";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from "react-native-reanimated";

import { AppText } from "@/components/ui/AppText";
import { BentoTile } from "@/components/ui/BentoTile";
import { FlameIcon } from "@/components/ui/FlameIcon";
import { useTheme } from "@/theme/useTheme";

type Props = {
  streak: number;
};

/** Approximates which days this week are covered by the current streak. */
function weekProgress(streak: number): boolean[] {
  const jsDay = new Date().getDay();
  const todayIndex = jsDay === 0 ? 6 : jsDay - 1;
  const done = Array(7).fill(false);
  let remaining = Math.max(0, streak);
  for (let i = todayIndex; i >= 0 && remaining > 0; i--) {
    done[i] = true;
    remaining--;
  }
  return done;
}

export function StreakTile({ streak }: Props) {
  const theme = useTheme();
  const days = weekProgress(streak);
  const jsDay = new Date().getDay();
  const todayIndex = jsDay === 0 ? 6 : jsDay - 1;

  // Elastic pop when the streak ticks up (e.g. a partner's photo arrives over
  // the WebSocket and the query refetches a higher count). Runs on the UI
  // thread so the real-time update never drops frames.
  const bump = useSharedValue(1);
  const prevStreak = useRef(streak);
  useEffect(() => {
    if (streak > prevStreak.current) {
      bump.value = withSequence(
        withSpring(1.22, { damping: 7, stiffness: 220 }),
        withSpring(1, { damping: 12, stiffness: 180 }),
      );
    }
    prevStreak.current = streak;
  }, [streak, bump]);
  const bumpStyle = useAnimatedStyle(() => ({
    transform: [{ scale: bump.value }],
  }));

  return (
    <BentoTile
      category="Streak"
      accessibilityLabel="Open streak"
      onPress={() => router.push("/streak" as Href)}
    >
      <View style={styles.body}>
        <View>
          <Animated.View style={[styles.countRow, bumpStyle]}>
            <FlameIcon size={30} />
            <AppText variant="h1" style={styles.count}>
              {streak}
            </AppText>
          </Animated.View>
          <AppText variant="caption" color="muted">
            day streak
          </AppText>
        </View>

        <View style={styles.week}>
          {days.map((done, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: done
                    ? theme.colors.accent.flame
                    : theme.colors.surface.cardElevated,
                },
                i === todayIndex && {
                  borderWidth: 1.5,
                  borderColor: theme.colors.accent.primary,
                },
              ]}
            />
          ))}
        </View>
      </View>
    </BentoTile>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    justifyContent: "space-between",
    gap: 12,
  },
  countRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  count: {
    fontFamily: "Fraunces_700Bold",
  },
  week: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});
