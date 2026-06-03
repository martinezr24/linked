import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/api/queryKeys";
import { fetchWidgetSummary } from "@/api/fetchers";
import { AppText } from "@/components/ui/AppText";
import { ArtifactCard } from "@/components/ui/ArtifactCard";
import { FlameIcon } from "@/components/ui/FlameIcon";
import { useRelationship } from "@/context/RelationshipContext";
import { formatCountdown } from "@/utils/widgetFormat";
import { useTheme } from "@/theme/useTheme";

type Props = { compact?: boolean };

export function WidgetPreviewCard({ compact = false }: Props) {
  const theme = useTheme();
  const { deviceId } = useRelationship();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.widgetSummary,
    queryFn: () => fetchWidgetSummary(deviceId!),
    enabled: Boolean(deviceId),
  });

  if (isLoading) {
    return (
      <View style={[styles.loader, compact && styles.compactLoader]}>
        <ActivityIndicator color={theme.colors.accent.primary} />
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

  const content = (
    <>
      {countdown ? (
        <AppText variant="h2" style={styles.countdown}>
          {countdown}
        </AppText>
      ) : (
        <AppText variant="body" color="muted">
          No upcoming visit
        </AppText>
      )}
      <View style={styles.row}>
        <FlameIcon
          size={12}
          outer={theme.colors.accent.flame}
          inner={theme.colors.accent.flameInner}
        />
        <AppText variant="caption" color="secondary">
          {data.currentStreak}d ·{" "}
          {data.partnerCheckedIn ? "Partner in" : "Waiting"}
        </AppText>
      </View>
      {!compact ? (
        <AppText variant="label" color="muted" style={styles.hint}>
          Home screen widget — see widgets/README.md
        </AppText>
      ) : null}
    </>
  );

  if (compact) {
    return (
      <View
        style={[
          styles.compact,
          {
            backgroundColor: theme.colors.surface.card,
            borderColor: theme.colors.border.subtle,
          },
        ]}
      >
        <AppText variant="label" color="secondary">
          WIDGET
        </AppText>
        {content}
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <ArtifactCard category="Widget" title="At a glance" stacked>
        {content}
      </ArtifactCard>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: 20 },
  loader: {
    marginHorizontal: 20,
    marginBottom: 16,
    padding: 24,
    alignItems: "center",
  },
  compactLoader: { marginHorizontal: 0, padding: 16 },
  compact: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    minHeight: 120,
  },
  countdown: { marginVertical: 8, fontFamily: "DMSans_700Bold" },
  row: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  hint: { marginTop: 10 },
});
