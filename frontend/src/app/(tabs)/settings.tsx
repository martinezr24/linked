import { Platform, Pressable, RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { AnniversaryCard } from "@/components/AnniversaryCard";
import { AppText } from "@/components/ui/AppText";
import { CoupleMilestones } from "@/components/CoupleMilestones";
import { ConnectedHeader } from "@/components/ui/ConnectedHeader";
import { ScreenBackground } from "@/components/ui/ScreenBackground";
import { TabSettingsIcon } from "@/components/ui/TabIcons";
import { queryKeys } from "@/api/queryKeys";
import { fetchPhotoToday, fetchRelationship } from "@/api/fetchers";
import { useCoupleNames } from "@/hooks/useCoupleNames";
import { useProfile } from "@/hooks/useProfile";
import { useTabReload } from "@/hooks/useTabReload";
import { useRelationship } from "@/context/RelationshipContext";
import { initialFromName } from "@/utils/coupleNames";
import { totalDaysTogether } from "@/utils/anniversary";
import { colors } from "@/theme/tokens";

const TAB_BAR_HEIGHT = Platform.OS === "ios" ? 88 : 64;

function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.statTile}>
      <AppText variant="h1">{value}</AppText>
      <AppText variant="caption" color="secondary" style={styles.statLabel}>
        {label}
      </AppText>
    </View>
  );
}

export default function CoupleScreen() {
  const { deviceId } = useRelationship();
  const queryClient = useQueryClient();
  const { scrollRef, refreshing, onRefresh } = useTabReload(() =>
    queryClient.invalidateQueries(),
  );
  const { mineName, partnerName } = useCoupleNames();
  const { mineAvatarUrl, partnerAvatarUrl, mineColor, partnerColor } =
    useProfile();

  const { data: photoToday } = useQuery({
    queryKey: queryKeys.photoToday,
    queryFn: () => fetchPhotoToday(deviceId!),
    enabled: Boolean(deviceId),
  });
  const streakCount = photoToday?.currentStreak ?? 0;
  const longestStreak = photoToday?.longestStreak ?? 0;

  const { data: relationship } = useQuery({
    queryKey: queryKeys.relationship,
    queryFn: () => fetchRelationship(deviceId!),
    enabled: Boolean(deviceId),
  });
  const anniversary = relationship?.anniversaryAt ?? null;
  const daysTogether = anniversary ? totalDaysTogether(anniversary) : null;

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ConnectedHeader
          streakCount={streakCount}
          showStreak={false}
          mineInitial={initialFromName(mineName, "M")}
          partnerInitial={initialFromName(partnerName, "Y")}
          mineAvatarUrl={mineAvatarUrl}
          partnerAvatarUrl={partnerAvatarUrl}
          mineColor={mineColor}
          partnerColor={partnerColor}
          minePhotoSent={Boolean(photoToday?.mine)}
          partnerPhotoSent={Boolean(photoToday?.partner)}
          headerRight={
            <Pressable
              onPress={() => router.push("/settings")}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Settings"
            >
              <TabSettingsIcon color={colors.text.primary} />
            </Pressable>
          }
        />

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: TAB_BAR_HEIGHT + 40 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.text.secondary}
            />
          }
        >
          <AnniversaryCard />

          <View style={styles.statsRow}>
            <StatTile
              value={daysTogether != null ? daysTogether.toLocaleString() : "–"}
              label="Days together"
            />
            <StatTile value={String(streakCount)} label="Day streak" />
            <StatTile value={String(longestStreak)} label="Best streak" />
          </View>

          <CoupleMilestones />
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingTop: 8, paddingHorizontal: 20 },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  statTile: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    backgroundColor: colors.surface.card,
  },
  statLabel: { marginTop: 2, textAlign: "center" },
});
