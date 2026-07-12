import { StyleSheet, View } from "react-native";
import { type Href, router } from "expo-router";

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

  return (
    <BentoTile
      category="Streak"
      accessibilityLabel="Open streak"
      onPress={() => router.push("/streak" as Href)}
    >
      <View style={styles.body}>
        <View>
          <View style={styles.countRow}>
            <FlameIcon size={30} />
            <AppText variant="h1" style={styles.count}>
              {streak}
            </AppText>
          </View>
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
