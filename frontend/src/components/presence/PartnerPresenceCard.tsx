import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/api/queryKeys";
import { fetchPartnerPresence } from "@/api/fetchers";
import { AppText } from "@/components/ui/AppText";
import { ArtifactCard } from "@/components/ui/ArtifactCard";
import { AvatarImage } from "@/components/ui/AvatarImage";
import { useRelationship } from "@/context/RelationshipContext";
import { useProfile } from "@/hooks/useProfile";
import { colors } from "@/theme/tokens";
import { initialFromName } from "@/utils/coupleNames";

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

function formatStatusAge(iso?: string): string | null {
  if (!iso) return null;
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  return `${hours}h ago`;
}

function BatteryBar({ percent }: { percent: number }) {
  const low = percent < 20;
  const fillColor = low ? colors.accent.primary : colors.accent.success;

  return (
    <View style={styles.batteryWrap}>
      <View style={styles.batteryTrack}>
        <View
          style={[
            styles.batteryFill,
            { width: `${percent}%`, backgroundColor: fillColor },
          ]}
        />
      </View>
      <AppText variant="bodySemibold">{percent}%</AppText>
      {low ? (
        <AppText variant="caption" color="accent">
          Low battery
        </AppText>
      ) : null}
    </View>
  );
}

export function PartnerPresenceCard() {
  const { deviceId } = useRelationship();
  const { partnerName, partnerColor } = useProfile();

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

  const name = data.displayName?.trim() || partnerName?.trim() || "Partner";
  const hasWeather =
    Boolean(data.weatherSummary) && data.temperatureF != null;
  const weatherLine = hasWeather
    ? `${data.weatherSummary} · ${data.temperatureF}°F`
    : null;
  const statusAge = formatStatusAge(data.statusUpdatedAt);

  return (
    <View style={styles.wrap}>
      <ArtifactCard>
        <AppText variant="label" color="secondary" style={styles.category}>
          THEIR WORLD
        </AppText>

        <View style={styles.nameRow}>
          <AppText variant="h2" style={styles.name}>
            {name}
          </AppText>
          <AvatarImage
            url={data.profilePictureUrl}
            initial={initialFromName(name, "P")}
            fallbackColor={partnerColor ?? colors.avatar.partner}
            size={44}
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <View style={styles.block}>
            <AppText variant="caption" color="secondary">
              LOCAL TIME
            </AppText>
            <AppText variant="h2">{data.localTime}</AppText>
            {data.timezone ? (
              <AppText variant="caption" color="muted" style={styles.tz}>
                {data.timezone}
              </AppText>
            ) : null}
            {data.weatherCity ? (
              <AppText variant="caption" color="muted">
                {data.weatherCity}
              </AppText>
            ) : null}
          </View>

          <View style={[styles.block, styles.rightBlock]}>
            <AppText variant="caption" color="secondary">
              WEATHER
            </AppText>
            {hasWeather ? (
              <>
                <AppText style={styles.weatherEmoji}>
                  {weatherEmoji(data.weatherSummary)}
                </AppText>
                <AppText variant="bodySemibold">{weatherLine}</AppText>
              </>
            ) : (
              <AppText variant="body" color="muted" style={styles.hint}>
                Unavailable
              </AppText>
            )}
          </View>
        </View>

        <View style={[styles.row, styles.statusRow]}>
          <View style={styles.block}>
            <AppText variant="caption" color="secondary">
              STATUS
            </AppText>
            {data.statusMessage ? (
              <>
                <AppText variant="bodySemibold" style={styles.statusText}>
                  {data.statusMessage}
                </AppText>
                {statusAge ? (
                  <AppText variant="caption" color="muted">
                    Updated {statusAge}
                  </AppText>
                ) : null}
              </>
            ) : (
              <AppText variant="body" color="muted">
                No status set
              </AppText>
            )}
          </View>

          <View style={[styles.block, styles.rightBlock]}>
            <AppText variant="caption" color="secondary">
              BATTERY
            </AppText>
            {data.batteryPercent != null ? (
              <BatteryBar percent={data.batteryPercent} />
            ) : (
              <AppText variant="body" color="muted" style={styles.hint}>
                Unavailable
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
  category: { marginBottom: 8 },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },
  name: { flex: 1 },
  divider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.06)",
    marginBottom: 14,
  },
  tz: { marginTop: 4 },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 16,
  },
  statusRow: { marginTop: 16 },
  block: { flex: 1 },
  rightBlock: { alignItems: "flex-end" },
  weatherEmoji: { fontSize: 24, marginVertical: 2 },
  hint: { marginTop: 6, textAlign: "right", lineHeight: 20 },
  statusText: { marginTop: 4 },
  batteryWrap: { alignItems: "flex-end", marginTop: 4, gap: 4 },
  batteryTrack: {
    width: 100,
    height: 10,
    borderRadius: 5,
    backgroundColor: "rgba(255,255,255,0.12)",
    overflow: "hidden",
  },
  batteryFill: {
    height: "100%",
    borderRadius: 5,
  },
});
