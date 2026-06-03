import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/api/queryKeys";
import { fetchWidgetSummary } from "@/api/fetchers";
import { useRelationship } from "@/context/RelationshipContext";
import { formatCountdown } from "@/utils/widgetFormat";

export function WidgetPreviewCard() {
  const { deviceId } = useRelationship();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.widgetSummary,
    queryFn: () => fetchWidgetSummary(deviceId!),
    enabled: Boolean(deviceId),
  });

  if (isLoading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator color="#000" />
      </View>
    );
  }

  if (!data) return null;

  const countdown =
    data.nextVisitAt != null
      ? formatCountdown(data.nextVisitAt)
      : data.nextEventAt != null
        ? formatCountdown(data.nextEventAt)
        : null;

  return (
    <View style={styles.card}>
      <Text style={styles.label}>Widget preview</Text>
      {countdown ? (
        <Text style={styles.countdown}>{countdown}</Text>
      ) : (
        <Text style={styles.muted}>No upcoming visit set</Text>
      )}
      <Text style={styles.pulse}>
        {data.partnerCheckedIn ? "Partner checked in ✓" : "Partner not yet today"}
        {" · "}
        {data.currentStreak}d streak
      </Text>
      <Text style={styles.hint}>
        Add a home screen widget — see widgets/README.md
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  label: { color: "#888", fontSize: 12, fontWeight: "600", marginBottom: 8 },
  countdown: { color: "#fff", fontSize: 22, fontWeight: "800", marginBottom: 6 },
  pulse: { color: "#ccc", fontSize: 14 },
  muted: { color: "#aaa", fontSize: 15, marginBottom: 6 },
  hint: { color: "#666", fontSize: 11, marginTop: 10 },
});
