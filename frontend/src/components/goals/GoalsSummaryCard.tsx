import { Pressable, StyleSheet, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";

import { queryKeys } from "@/api/queryKeys";
import { fetchGoals } from "@/api/fetchers";
import { AppText } from "@/components/ui/AppText";
import { ArtifactCard } from "@/components/ui/ArtifactCard";
import { ArrowRightIcon, CheckIcon } from "@/components/ui/icons";
import { WeeklyScoreRing } from "@/components/goals/WeeklyScoreRing";
import { useRelationship } from "@/context/RelationshipContext";
import { colors } from "@/theme/tokens";

export function GoalsSummaryCard() {
  const { deviceId } = useRelationship();

  const { data: goals = [] } = useQuery({
    queryKey: queryKeys.goals,
    queryFn: () => fetchGoals(deviceId!),
    enabled: Boolean(deviceId),
  });

  const completed = goals.filter((g) => g.done).length;
  const total = goals.length;

  return (
    <Pressable
      style={styles.wrap}
      onPress={() => router.push("/play")}
      accessibilityRole="button"
      accessibilityLabel="Open connection goals in Us"
    >
      <ArtifactCard category="Connection goals" title="This week's goals">
        <View style={styles.headerRow}>
          <AppText variant="body" color="secondary" style={styles.intro}>
            {total === 0
              ? "Set a few goals to keep growing closer."
              : `${completed} of ${total} done this week`}
          </AppText>
          {total > 0 ? (
            <WeeklyScoreRing completed={completed} total={total} />
          ) : null}
        </View>

        {goals.slice(0, 3).map((goal) => (
          <View key={goal.id} style={styles.goalRow}>
            {goal.done ? (
              <CheckIcon size={16} color={colors.accent.success} />
            ) : (
              <View style={styles.bullet} />
            )}
            <AppText color={goal.done ? "muted" : "primary"} style={styles.goalText}>
              {goal.goalText}
            </AppText>
          </View>
        ))}

        <View style={styles.link}>
          <AppText variant="bodySemibold" color="secondary">
            Open in Us
          </AppText>
          <ArrowRightIcon size={16} color={colors.text.secondary} />
        </View>
      </ArtifactCard>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: 20, marginBottom: 16 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 8,
  },
  intro: { flex: 1 },
  goalRow: {
    marginBottom: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  goalText: { flex: 1 },
  bullet: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginHorizontal: 5.5,
    backgroundColor: colors.text.muted,
  },
  link: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
});
