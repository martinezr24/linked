import { useState } from "react";
import { Keyboard, StyleSheet, View } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { AppTextInput } from "@/components/AppTextInput";
import { AppText } from "@/components/ui/AppText";
import { ArtifactCard } from "@/components/ui/ArtifactCard";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { GoalRow } from "@/components/goals/GoalRow";
import { queryKeys } from "@/api/queryKeys";
import { useRelationship } from "@/context/RelationshipContext";
import { apiFetch } from "@/utils/api";
import { showMutationError } from "@/utils/errors";
import { useTheme } from "@/theme/useTheme";
import type { WeeklyGoal } from "@/types";

type Props = {
  goals: WeeklyGoal[];
};

export function WeeklyGoalsCard({ goals }: Props) {
  const theme = useTheme();
  const { deviceId } = useRelationship();
  const queryClient = useQueryClient();
  const [goalInput, setGoalInput] = useState("");
  const completed = goals.filter((g) => g.done).length;
  const total = goals.length;

  const addGoal = useMutation({
    mutationFn: async (text: string) => {
      const res = await apiFetch("/api/goals/current", deviceId!, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goalText: text }),
      });
      if (!res.ok) throw new Error("Failed to add goal");
    },
    onSuccess: () => {
      setGoalInput("");
      void queryClient.invalidateQueries({ queryKey: queryKeys.goals });
    },
    onError: () => showMutationError("Could not add goal."),
  });

  const toggleGoal = useMutation({
    mutationFn: async (goal: WeeklyGoal) => {
      const res = await apiFetch(`/api/goals/${goal.id}`, deviceId!, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: !goal.done }),
      });
      if (!res.ok) throw new Error("Failed to update goal");
    },
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: queryKeys.goals }),
    onError: () => showMutationError("Could not update goal."),
  });

  const deleteGoal = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(`/api/goals/${id}`, deviceId!, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete goal");
    },
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: queryKeys.goals }),
    onError: () => showMutationError("Could not delete goal."),
  });

  const submitGoal = () => {
    const text = goalInput.trim();
    if (!text) return;
    Keyboard.dismiss();
    addGoal.mutate(text);
  };

  return (
    <View style={styles.section}>
      <ArtifactCard category="This week" title="Connection goals" style={styles.card}>
        <View style={styles.introRow}>
          <AppText variant="body" color="secondary" style={styles.intro}>
            Little things to grow closer this week.
          </AppText>
        </View>
        {total > 0 ? (
          <AppText variant="caption" color="secondary" style={styles.scoreHint}>
            {completed} of {total} done this week
          </AppText>
        ) : null}
        <View style={styles.goalInputRow}>
            <AppTextInput
              style={[
                styles.goalInput,
                {
                  backgroundColor: theme.colors.surface.input,
                  borderColor: theme.colors.border.subtle,
                  color: theme.colors.text.primary,
                },
              ]}
              value={goalInput}
              onChangeText={setGoalInput}
              placeholder="e.g. FaceTime Friday night"
              placeholderTextColor={theme.colors.text.muted}
              returnKeyType="done"
              blurOnSubmit
              onSubmitEditing={submitGoal}
            />
            <PrimaryButton
              label="Add"
              onPress={submitGoal}
              disabled={!goalInput.trim()}
              style={styles.addGoalBtn}
            />
          </View>
          {goals.length === 0 ? (
            <AppText variant="body" color="muted">
              No goals yet — add one above.
            </AppText>
          ) : (
            goals.map((goal) => (
              <GoalRow
                key={goal.id}
                goal={goal}
                onToggle={() => toggleGoal.mutate(goal)}
                onDelete={() => deleteGoal.mutate(goal.id)}
              />
            ))
          )}
      </ArtifactCard>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {},
  card: { marginBottom: 0 },
  introRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 8,
  },
  intro: { flex: 1 },
  scoreHint: { marginBottom: 12, letterSpacing: 0.5 },
  goalInputRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  goalInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  addGoalBtn: { alignSelf: "center" },
});
