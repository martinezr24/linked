import { Platform, Pressable, RefreshControl, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { AnniversaryCard } from "@/components/AnniversaryCard";
import { ConnectedHeader } from "@/components/ui/ConnectedHeader";
import { ScreenBackground } from "@/components/ui/ScreenBackground";
import { TabSettingsIcon } from "@/components/ui/TabIcons";
import { queryKeys } from "@/api/queryKeys";
import { fetchPhotoToday } from "@/api/fetchers";
import { useCoupleNames } from "@/hooks/useCoupleNames";
import { useProfile } from "@/hooks/useProfile";
import { useTabReload } from "@/hooks/useTabReload";
import { useRelationship } from "@/context/RelationshipContext";
import { initialFromName } from "@/utils/coupleNames";
import { colors } from "@/theme/tokens";

const TAB_BAR_HEIGHT = Platform.OS === "ios" ? 88 : 64;

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

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ConnectedHeader
          streakCount={streakCount}
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
        </ScrollView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingTop: 8 },
});
