import { StyleSheet, View } from "react-native";

import { AppText } from "./AppText";
import { ConnectionLink } from "./ConnectionLink";
import { FlameIcon } from "./FlameIcon";
import { useTheme } from "@/theme/useTheme";

const DAY_LABELS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

type Props = {
  currentStreak: number;
  bothCompletedToday: boolean;
};

/** Approximates week progress from streak count until history API exists. */
function buildWeekState(currentStreak: number, bothToday: boolean): boolean[] {
  const today = new Date().getDay();
  const mondayIndex = today === 0 ? 6 : today - 1;
  const completed = Array(7).fill(false);

  let remaining = Math.max(0, currentStreak);
  for (let i = mondayIndex; i >= 0 && remaining > 0; i--) {
    completed[i] = true;
    remaining--;
  }
  if (bothToday) {
    completed[mondayIndex] = true;
  }
  return completed;
}

export function WeekStreakTracker({ currentStreak, bothCompletedToday }: Props) {
  const theme = useTheme();
  const week = buildWeekState(currentStreak, bothCompletedToday);
  const completedIndices = week
    .map((done, i) => (done ? i : -1))
    .filter((i) => i >= 0);

  return (
    <View style={styles.wrap}>
      <View style={styles.daysRow}>
        {DAY_LABELS.map((label, index) => {
          const done = week[index];
          const showConnector =
            done &&
            completedIndices.includes(index) &&
            completedIndices.includes(index + 1);

          return (
            <View key={label} style={styles.dayCol}>
              <View style={styles.nodeWrap}>
                {showConnector && index < 6 ? (
                  <View style={styles.connector}>
                    <ConnectionLink length={28} showBow={false} />
                  </View>
                ) : null}
                <View
                  style={[
                    styles.node,
                    {
                      borderColor: done
                        ? theme.colors.accent.primary
                        : theme.colors.border.subtle,
                      backgroundColor: done
                        ? "rgba(230,57,70,0.15)"
                        : theme.colors.surface.cardElevated,
                    },
                  ]}
                >
                  {done ? (
                    <FlameIcon
                      size={14}
                      outer={theme.colors.accent.flame}
                      inner={theme.colors.accent.flameInner}
                    />
                  ) : null}
                </View>
              </View>
              <AppText variant="label" color="muted" style={styles.label}>
                {label}
              </AppText>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginVertical: 16 },
  daysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  dayCol: { alignItems: "center", flex: 1 },
  nodeWrap: {
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  node: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  connector: {
    position: "absolute",
    left: "50%",
    top: 12,
    zIndex: 0,
    marginLeft: 4,
  },
  label: { marginTop: 6, fontSize: 9 },
});
