import { Pressable, StyleSheet, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";

import { queryKeys } from "@/api/queryKeys";
import { fetchGoals } from "@/api/fetchers";
import { AppText } from "@/components/ui/AppText";
import { ArtifactCard } from "@/components/ui/ArtifactCard";
import { WeeklyScoreRing } from "@/components/goals/WeeklyScoreRing";
import { useRelationship } from "@/context/RelationshipContext";

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
            <AppText color={goal.done ? "muted" : "primary"}>
              {goal.done ? "✓  " : "•  "}
              {goal.goalText}
            </AppText>
          </View>
        ))}

        <AppText variant="bodySemibold" color="secondary" style={styles.link}>
          Open in Us →
        </AppText>
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
  goalRow: { marginBottom: 6 },
  link: { marginTop: 10 },
});
