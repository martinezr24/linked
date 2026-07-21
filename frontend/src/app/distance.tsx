import { Pressable, ScrollView, Share, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { AppText } from "@/components/ui/AppText";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { ScreenBackground } from "@/components/ui/ScreenBackground";
import { ArrowLeftIcon } from "@/components/ui/icons";
import { DistanceMap } from "@/components/distance/DistanceMap";
import { useCoupleDistance } from "@/hooks/useCoupleDistance";
import { useDistanceUnit } from "@/hooks/useDistanceUnit";
import { formatDistance, type DistanceUnit } from "@/utils/distance";
import { useTheme } from "@/theme/useTheme";

const UNITS: DistanceUnit[] = ["mi", "km"];

export default function DistanceScreen() {
  const theme = useTheme();
  const {
    haveBoth,
    me,
    partner,
    meters,
    meName,
    partnerName,
    meCity,
    partnerCity,
  } = useCoupleDistance();
  const { unit, setUnit } = useDistanceUnit();

  const ready = haveBoth && me && partner && meters != null;

  const onShare = () => {
    if (meters == null) return;
    void Share.share({
      message: `We're ${formatDistance(meters, unit)} ${unit} apart \u2764\ufe0f`,
    });
  };

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <Pressable
          onPress={() => router.back()}
          style={styles.back}
          hitSlop={12}
          accessibilityLabel="Go back"
        >
          <ArrowLeftIcon size={24} color={theme.colors.text.primary} />
        </Pressable>

        {ready ? (
          <View style={styles.mapWrap}>
            <DistanceMap me={me} partner={partner} interactive style={styles.map} />
          </View>
        ) : null}

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {ready ? (
            <>
              <AppText style={styles.number}>
                {formatDistance(meters, unit)}
              </AppText>
              <AppText variant="caption" color="secondary" style={styles.label}>
                DISTANCE APART
              </AppText>

              <View
                style={[
                  styles.segment,
                  { backgroundColor: theme.colors.surface.cardElevated },
                ]}
              >
                {UNITS.map((u) => {
                  const selected = u === unit;
                  return (
                    <Pressable
                      key={u}
                      onPress={() => setUnit(u)}
                      style={[
                        styles.segmentBtn,
                        selected && {
                          backgroundColor: theme.colors.accent.primary,
                        },
                      ]}
                    >
                      <AppText
                        variant="bodySemibold"
                        style={{
                          color: selected
                            ? theme.colors.text.onAccent
                            : theme.colors.text.secondary,
                        }}
                      >
                        {u.toUpperCase()}
                      </AppText>
                    </Pressable>
                  );
                })}
              </View>

              <View style={styles.peopleRow}>
                <View style={styles.person}>
                  <AppText variant="caption" color="muted">
                    {meName}
                  </AppText>
                  {meCity ? (
                    <AppText variant="h2" style={styles.city}>
                      {meCity}
                    </AppText>
                  ) : null}
                </View>
                <View style={[styles.person, styles.personRight]}>
                  <AppText variant="caption" color="muted">
                    {partnerName}
                  </AppText>
                  {partnerCity ? (
                    <AppText variant="h2" style={[styles.city, styles.cityRight]}>
                      {partnerCity}
                    </AppText>
                  ) : null}
                </View>
              </View>

              <PrimaryButton label="Share" onPress={onShare} style={styles.share} />
            </>
          ) : (
            <View style={styles.empty}>
              <AppText variant="h2" style={styles.emptyTitle}>
                Not enough location data yet
              </AppText>
              <AppText variant="body" color="secondary" style={styles.emptyBody}>
                Both of you need to share a location. Make sure location sharing
                is on for you and your partner, then check back.
              </AppText>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  back: { paddingHorizontal: 20, paddingVertical: 8 },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  mapWrap: { paddingHorizontal: 20, marginBottom: 20 },
  map: {
    height: 340,
    borderRadius: 24,
  },
  number: {
    fontFamily: "Fraunces_700Bold",
    fontSize: 68,
    lineHeight: 74,
    textAlign: "center",
    color: "#F5F0F1",
  },
  label: {
    textAlign: "center",
    letterSpacing: 3,
    textTransform: "uppercase",
    marginTop: 2,
  },
  segment: {
    flexDirection: "row",
    alignSelf: "center",
    borderRadius: 999,
    padding: 4,
    marginTop: 20,
  },
  segmentBtn: {
    paddingVertical: 8,
    paddingHorizontal: 26,
    borderRadius: 999,
  },
  peopleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 28,
  },
  person: { flex: 1 },
  personRight: { alignItems: "flex-end" },
  city: { marginTop: 2 },
  cityRight: { textAlign: "right" },
  share: { marginTop: 32 },
  empty: { marginTop: 80, alignItems: "center" },
  emptyTitle: { textAlign: "center", marginBottom: 10 },
  emptyBody: { textAlign: "center" },
});
