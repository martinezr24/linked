import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/AppText";
import { WeeklyScoreRing } from "@/components/goals/WeeklyScoreRing";
import { colors } from "@/theme/tokens";

type Props = {
  completed: number;
  total: number;
};

export function WeeklyGoalsTile({ completed, total }: Props) {
  return (
    <View style={styles.tile}>
      <AppText variant="label" color="secondary" style={styles.category}>
        THIS WEEK
      </AppText>
      {total > 0 ? (
        <View style={styles.body}>
          <WeeklyScoreRing completed={completed} total={total} />
          <AppText variant="caption" color="secondary" style={styles.count}>
            {completed} of {total} done
          </AppText>
        </View>
      ) : (
        <View style={styles.body}>
          <AppText variant="bodySemibold">Set goals</AppText>
          <AppText variant="caption" color="muted" style={styles.count}>
            None yet this week
          </AppText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    flex: 1,
    minHeight: 96,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.card,
    padding: 14,
    overflow: "hidden",
  },
  category: { marginBottom: 8 },
  body: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8 },
  count: { textAlign: "center" },
});
