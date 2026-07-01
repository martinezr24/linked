import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AppText } from "@/components/ui/AppText";
import { ArtifactCard } from "@/components/ui/ArtifactCard";
import { DatePickerField } from "@/components/DatePickerField";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { TabCoupleIcon } from "@/components/ui/TabIcons";
import { queryKeys } from "@/api/queryKeys";
import { fetchRelationship } from "@/api/fetchers";
import { useRelationship } from "@/context/RelationshipContext";
import { apiFetch } from "@/utils/api";
import { showMutationError } from "@/utils/errors";
import {
  nextAnniversary,
  timeTogether,
  type NextAnniversary,
} from "@/utils/anniversary";
import { useTheme } from "@/theme/useTheme";

function toDateOnly(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function formatUntil(n: NextAnniversary): string {
  const parts: string[] = [];
  if (n.months) parts.push(`${n.months} month${n.months === 1 ? "" : "s"}`);
  parts.push(`${n.days} day${n.days === 1 ? "" : "s"}`);
  return parts.join(" & ");
}

function PencilIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24">
      <Path
        d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 000-1.41l-2.34-2.34a1 1 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"
        fill={color}
      />
    </Svg>
  );
}

function DurationStat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.statCell}>
      <AppText variant="h1" style={styles.statValue}>
        {value}
      </AppText>
      <AppText variant="caption" color="secondary">
        {label}
      </AppText>
    </View>
  );
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
  const upcoming = anniversary ? nextAnniversary(anniversary) : null;

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
      <ArtifactCard category="Together for">
        <View style={styles.unsetHeart}>
          <View
            style={[
              styles.heartCircle,
              { backgroundColor: theme.colors.bg.canvas },
            ]}
          >
            <TabCoupleIcon size={36} color={theme.colors.accent.primary} />
          </View>
        </View>
        <AppText variant="h2" style={styles.unsetTitle}>
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
    <ArtifactCard featured category="Together for">
      <Pressable
        onPress={startEditing}
        hitSlop={12}
        accessibilityRole="button"
        accessibilityLabel="Edit anniversary date"
        style={styles.editBtn}
      >
        <PencilIcon color={theme.colors.text.secondary} />
      </Pressable>

      <View style={styles.heroRow}>
        <View style={styles.heroLeft}>
          <View
            style={[
              styles.heartCircle,
              { backgroundColor: theme.colors.bg.canvas },
            ]}
          >
            <TabCoupleIcon size={40} color={theme.colors.accent.primary} />
          </View>
          {upcoming ? (
            <View style={styles.untilWrap}>
              <AppText variant="body" color="secondary">
                {formatUntil(upcoming)} until
              </AppText>
              <AppText variant="h2">
                {upcoming.yearNumber} year anniversary
              </AppText>
            </View>
          ) : null}
        </View>

        <View
          style={[
            styles.heroRight,
            { borderLeftColor: theme.colors.border.subtle },
          ]}
        >
          <DurationStat value={duration.years} label="Years" />
          <View
            style={[
              styles.statDivider,
              { backgroundColor: theme.colors.border.subtle },
            ]}
          />
          <DurationStat value={duration.months} label="Months" />
          <View
            style={[
              styles.statDivider,
              { backgroundColor: theme.colors.border.subtle },
            ]}
          />
          <DurationStat value={duration.days} label="Days" />
        </View>
      </View>
    </ArtifactCard>
  );
}

const styles = StyleSheet.create({
  title: { marginBottom: 8 },
  hint: { marginBottom: 16, textAlign: "center" },
  editRow: { flexDirection: "row", gap: 12, marginTop: 16 },
  flexBtn: { flex: 1 },
  editBtn: {
    position: "absolute",
    top: 14,
    right: 14,
    zIndex: 2,
    padding: 4,
  },
  heroRow: { flexDirection: "row", alignItems: "stretch", gap: 16 },
  heroLeft: { flex: 1, alignItems: "center", justifyContent: "center" },
  heartCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  untilWrap: { alignItems: "center" },
  heroRight: {
    width: 96,
    borderLeftWidth: 1,
    paddingLeft: 16,
    justifyContent: "center",
  },
  statCell: { alignItems: "flex-start" },
  statValue: { marginBottom: 0 },
  statDivider: { height: 1, marginVertical: 10 },
  unsetHeart: { alignItems: "center", marginBottom: 12 },
  unsetTitle: { textAlign: "center", marginBottom: 8 },
});
