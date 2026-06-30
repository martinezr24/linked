import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AppText } from "@/components/ui/AppText";
import { ArtifactCard } from "@/components/ui/ArtifactCard";
import { DatePickerField } from "@/components/DatePickerField";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { queryKeys } from "@/api/queryKeys";
import { fetchRelationship } from "@/api/fetchers";
import { useRelationship } from "@/context/RelationshipContext";
import { apiFetch } from "@/utils/api";
import { showMutationError } from "@/utils/errors";
import {
  daysUntilNextAnniversary,
  formatTogether,
  timeTogether,
} from "@/utils/anniversary";
import { useTheme } from "@/theme/useTheme";

function toDateOnly(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

export function AnniversaryCard() {
  const theme = useTheme();
  const { deviceId } = useRelationship();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Date | null>(null);

  const { data: relationship } = useQuery({
    queryKey: queryKeys.relationship,
    queryFn: () => fetchRelationship(deviceId!),
    enabled: Boolean(deviceId),
  });

  const anniversary = relationship?.anniversaryAt ?? null;

  const save = useMutation({
    mutationFn: async (value: string | null) => {
      const res = await apiFetch("/api/relationship/anniversary", deviceId!, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anniversaryAt: value }),
      });
      if (!res.ok) throw new Error("Failed to save anniversary");
      return res.json();
    },
    onSuccess: () => {
      setEditing(false);
      void queryClient.invalidateQueries({ queryKey: queryKeys.relationship });
    },
    onError: () => showMutationError("Could not save your anniversary."),
  });

  const startEditing = () => {
    setDraft(anniversary ? new Date(`${anniversary}T00:00:00`) : new Date());
    setEditing(true);
  };

  const duration = anniversary ? timeTogether(anniversary) : null;
  const untilNext = anniversary ? daysUntilNextAnniversary(anniversary) : null;

  if (editing) {
    return (
      <ArtifactCard category="Anniversary">
        <AppText variant="h2" style={styles.title}>
          When did it all begin?
        </AppText>
        <DatePickerField
          label="Anniversary date"
          value={draft}
          onChange={setDraft}
          maximumDate={new Date()}
        />
        <View style={styles.editRow}>
          <PrimaryButton
            label="Save"
            loading={save.isPending}
            onPress={() => draft && save.mutate(toDateOnly(draft))}
            style={styles.flexBtn}
          />
          <PrimaryButton
            label="Cancel"
            variant="ghost"
            onPress={() => setEditing(false)}
            style={styles.flexBtn}
          />
        </View>
      </ArtifactCard>
    );
  }

  if (!anniversary || !duration) {
    return (
      <ArtifactCard category="Anniversary">
        <AppText variant="h2" style={styles.title}>
          Together since…
        </AppText>
        <AppText variant="body" color="secondary" style={styles.hint}>
          Set your anniversary to count every day you&apos;ve shared.
        </AppText>
        <PrimaryButton label="Set anniversary" onPress={startEditing} />
      </ArtifactCard>
    );
  }

  return (
    <ArtifactCard category="Anniversary">
      <AppText variant="caption" color="secondary" style={styles.label}>
        Together for
      </AppText>
      <AppText variant="h1" style={styles.duration}>
        {formatTogether(duration)}
      </AppText>
      {untilNext !== null ? (
        <AppText
          variant="body"
          style={[styles.countdown, { color: theme.colors.accent.primary }]}
        >
          {untilNext === 0
            ? "🎉 Happy anniversary today!"
            : `${untilNext} day${untilNext === 1 ? "" : "s"} until your next anniversary`}
        </AppText>
      ) : null}
      <PrimaryButton
        label="Edit date"
        variant="ghost"
        onPress={startEditing}
        style={styles.editDate}
      />
    </ArtifactCard>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: 8 },
  hint: { marginBottom: 16 },
  label: { textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 },
  duration: { marginBottom: 8 },
  countdown: { marginBottom: 4 },
  editDate: { marginTop: 12, alignSelf: "flex-start" },
  editRow: { flexDirection: "row", gap: 12, marginTop: 16 },
  flexBtn: { flex: 1 },
});
