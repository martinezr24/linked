import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";

import { AppText } from "@/components/ui/AppText";
import { ArtifactCard } from "@/components/ui/ArtifactCard";
import { DistanceMap } from "@/components/distance/DistanceMap";
import { useCoupleDistance } from "@/hooks/useCoupleDistance";
import { formatDistance, type DistanceUnit } from "@/utils/distance";
import { loadDistanceUnit } from "@/utils/distanceUnitStorage";
import { colors } from "@/theme/tokens";

function PersonRow({
  name,
  city,
  color,
}: {
  name: string;
  city?: string;
  color: string;
}) {
  return (
    <View style={styles.person}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <View style={styles.personText}>
        <AppText variant="caption" color="muted" numberOfLines={1}>
          {name}
        </AppText>
        <AppText variant="bodySemibold" numberOfLines={1}>
          {city ?? "—"}
        </AppText>
      </View>
    </View>
  );
}

export function DistanceCard() {
  const {
    isLoading,
    haveBoth,
    me,
    partner,
    meters,
    meName,
    partnerName,
    meCity,
    partnerCity,
    meMissing,
  } = useCoupleDistance();
  const [unit, setUnit] = useState<DistanceUnit>("mi");

  useEffect(() => {
    void loadDistanceUnit().then(setUnit);
  }, []);

  if (isLoading) return null;

  if (!haveBoth || !me || !partner || meters == null) {
    return (
      <ArtifactCard category="Distance apart">
        <AppText variant="body" color="secondary">
          {meMissing
            ? "Turn on location sharing to see how far apart you two are."
            : "Waiting for your partner to share their location."}
        </AppText>
      </ArtifactCard>
    );
  }

  return (
    <ArtifactCard
      category="Distance apart"
      onPress={() => router.push("/distance")}
      accessibilityLabel="Open distance apart"
    >
      <View style={styles.row}>
        {/* Cities are shown in the stats block beside the preview, so the small
            map keeps its floating labels off. The full-screen map shows them. */}
        <DistanceMap
          me={me}
          partner={partner}
          showCityLabels={false}
          style={styles.map}
        />
        <View style={styles.stats}>
          <View>
            <AppText style={styles.number}>{formatDistance(meters, unit)}</AppText>
            <AppText variant="caption" color="secondary" style={styles.unit}>
              {unit} apart
            </AppText>
          </View>
          <View style={styles.people}>
            <PersonRow name={meName} city={meCity} color={colors.accent.primary} />
            <PersonRow
              name={partnerName}
              city={partnerCity}
              color={colors.event.partner.bg}
            />
          </View>
        </View>
      </View>
    </ArtifactCard>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 14 },
  map: { width: 130, height: 150, borderRadius: 16 },
  stats: { flex: 1, justifyContent: "space-between", paddingVertical: 2 },
  number: {
    fontFamily: "Fraunces_700Bold",
    fontSize: 40,
    lineHeight: 44,
    color: "#F5F0F1",
  },
  unit: { marginTop: -2 },
  people: { gap: 10 },
  person: { flexDirection: "row", alignItems: "center", gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  personText: { flex: 1 },
});
