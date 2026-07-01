import { StyleSheet, View } from "react-native";
import { useQuery } from "@tanstack/react-query";

import { AppText } from "@/components/ui/AppText";
import { ArtifactCard } from "@/components/ui/ArtifactCard";
import { queryKeys } from "@/api/queryKeys";
import { fetchRelationship } from "@/api/fetchers";
import { useRelationship } from "@/context/RelationshipContext";
import { upcomingMilestones } from "@/utils/anniversary";
import { useTheme } from "@/theme/useTheme";

function formatDate(date: Date): string {
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function CoupleMilestones() {
  const theme = useTheme();
  const { deviceId } = useRelationship();

  const { data: relationship } = useQuery({
    queryKey: queryKeys.relationship,
    queryFn: () => fetchRelationship(deviceId!),
    enabled: Boolean(deviceId),
  });

  const anniversary = relationship?.anniversaryAt ?? null;
  if (!anniversary) return null;

  const milestones = upcomingMilestones(anniversary, new Date(), 3);
  if (!milestones.length) return null;

  return (
    <ArtifactCard category="Milestones">
      {milestones.map((m, i) => (
        <View
          key={m.key}
          style={[
            styles.row,
            i > 0 && {
              borderTopWidth: 1,
              borderTopColor: theme.colors.border.subtle,
            },
          ]}
        >
          <View
            style={[
              styles.dot,
              { backgroundColor: theme.colors.accent.primary },
            ]}
          />
          <View style={styles.info}>
            <AppText variant="bodySemibold">{m.label}</AppText>
            <AppText variant="caption" color="secondary">
              {formatDate(m.date)}
            </AppText>
          </View>
          <View style={styles.countPill}>
            <AppText variant="h2" color="accent">
              {m.daysUntil === 0 ? "Today" : m.daysUntil}
            </AppText>
            {m.daysUntil !== 0 ? (
              <AppText variant="label" color="secondary">
                {m.daysUntil === 1 ? "day" : "days"}
              </AppText>
            ) : null}
          </View>
        </View>
      ))}
    </ArtifactCard>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  info: { flex: 1 },
  countPill: { alignItems: "flex-end", minWidth: 48 },
});
