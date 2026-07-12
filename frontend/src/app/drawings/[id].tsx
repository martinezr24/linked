import { Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { AppText } from "@/components/ui/AppText";
import { ScreenBackground } from "@/components/ui/ScreenBackground";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { DoodlePlayback } from "@/components/DoodlePlayback";
import { queryKeys } from "@/api/queryKeys";
import { fetchDrawings } from "@/api/fetchers";
import { useRelationship } from "@/context/RelationshipContext";
import { useProfile } from "@/hooks/useProfile";
import { colors } from "@/theme/tokens";

export default function DoodleViewerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { deviceId } = useRelationship();
  const { partnerName } = useProfile();

  const { data: drawings = [] } = useQuery({
    queryKey: queryKeys.drawings,
    queryFn: () => fetchDrawings(deviceId!),
    enabled: Boolean(deviceId),
  });

  const drawing = drawings.find((d) => d.id === id);
  const partner = partnerName?.trim() || "your partner";

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <Pressable
            onPress={() => router.back()}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <ChevronLeftIcon size={28} color={colors.text.primary} />
          </Pressable>
          <AppText variant="h2">Doodle</AppText>
          <View style={styles.backSpacer} />
        </View>

        {drawing ? (
          <View style={styles.body}>
            <DoodlePlayback data={drawing.data} autoPlay={false} />
            <View style={styles.metaRow}>
              <AppText variant="bodySemibold">
                {drawing.isMine ? "From you" : `From ${partner}`}
              </AppText>
              <AppText color="muted" variant="caption">
                {new Date(drawing.createdAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </AppText>
            </View>
          </View>
        ) : (
          <View style={styles.empty}>
            <AppText color="secondary">This doodle is no longer available.</AppText>
          </View>
        )}
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, paddingHorizontal: 20 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  backSpacer: { width: 28 },
  body: { paddingTop: 12, gap: 16 },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  empty: { flex: 1, alignItems: "center", justifyContent: "center" },
});
