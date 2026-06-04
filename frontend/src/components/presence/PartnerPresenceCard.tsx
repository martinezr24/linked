import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/api/queryKeys";
import { fetchPartnerPresence } from "@/api/fetchers";
import { AppText } from "@/components/ui/AppText";
import { ArtifactCard } from "@/components/ui/ArtifactCard";
import { useRelationship } from "@/context/RelationshipContext";
import { useCoupleNames } from "@/hooks/useCoupleNames";
import { colors } from "@/theme/tokens";
function weatherEmoji(summary?: string): string {
  if (!summary) return "🌡️";
  const s = summary.toLowerCase();
  if (s.includes("clear")) return "☀️";
  if (s.includes("cloud")) return "☁️";
  if (s.includes("rain")) return "🌧️";
  if (s.includes("snow")) return "❄️";
  if (s.includes("storm")) return "⛈️";
  return "🌤️";
}

export function PartnerPresenceCard() {
  const { deviceId } = useRelationship();
  const { partnerName } = useCoupleNames();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.partnerPresence,
    queryFn: () => fetchPartnerPresence(deviceId!),
    enabled: Boolean(deviceId),
    refetchInterval: 60_000,
  });

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={colors.accent.primary} />
      </View>
    );
  }

  if (!data) return null;

  const name = partnerName?.trim() || "Partner";
  const hasWeather =
    Boolean(data.weatherSummary) && data.temperatureF != null;
  const weatherLine = hasWeather
    ? `${data.weatherSummary} · ${data.temperatureF}°F`
    : null;

  return (
    <View style={styles.wrap}>
      <ArtifactCard category="Their world" title={name}>
        <View style={styles.row}>
          <View style={styles.block}>
            <AppText variant="caption" color="secondary">
              LOCAL TIME
            </AppText>
            <AppText variant="h2">{data.localTime}</AppText>
            {data.timezone ? (
              <AppText variant="caption" color="muted">
                {data.timezone}
              </AppText>
            ) : null}
          </View>

          <View style={[styles.block, styles.weatherBlock]}>
            <AppText variant="caption" color="secondary">
              WEATHER
            </AppText>
            {hasWeather ? (
              <>
                <AppText style={styles.weatherEmoji}>
                  {weatherEmoji(data.weatherSummary)}
                </AppText>
                <AppText variant="bodySemibold">{weatherLine}</AppText>
                {data.weatherCity ? (
                  <AppText variant="caption" color="muted">
                    {data.weatherCity}
                  </AppText>
                ) : null}
              </>
            ) : (
              <AppText variant="body" color="muted" style={styles.weatherHint}>
                Unavailable — your partner can enable location or add their city
                in Settings.
              </AppText>
            )}
          </View>
        </View>
      </ArtifactCard>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginHorizontal: 20, marginBottom: 12 },
  loader: { padding: 16, alignItems: "center" },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
  },
  block: { flex: 1 },
  weatherBlock: { alignItems: "flex-end" },
  weatherEmoji: { fontSize: 28, marginVertical: 4 },
  weatherHint: { marginTop: 6, textAlign: "right", lineHeight: 20 },
});
