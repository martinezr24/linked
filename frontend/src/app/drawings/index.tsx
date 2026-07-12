import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { type Href, router } from "expo-router";
import { useQuery } from "@tanstack/react-query";

import { AppText } from "@/components/ui/AppText";
import { ScreenBackground } from "@/components/ui/ScreenBackground";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { DrawingCanvas } from "@/components/DrawingCanvas";
import { queryKeys } from "@/api/queryKeys";
import { fetchDrawings } from "@/api/fetchers";
import { useRelationship } from "@/context/RelationshipContext";
import { useProfile } from "@/hooks/useProfile";
import { colors } from "@/theme/tokens";

export default function DrawingsScreen() {
  const { deviceId } = useRelationship();
  const { partnerName } = useProfile();

  const { data: drawings = [] } = useQuery({
    queryKey: queryKeys.drawings,
    queryFn: () => fetchDrawings(deviceId!),
    enabled: Boolean(deviceId),
  });

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
          <AppText variant="h2">Doodles</AppText>
          <View style={styles.backSpacer} />
        </View>

        <FlatList
          data={drawings}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <AppText color="secondary" style={styles.empty}>
              No drawings yet.
            </AppText>
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.item}
              onPress={() =>
                router.push(`/drawings/${item.id}` as Href)
              }
              accessibilityRole="button"
              accessibilityLabel="View doodle"
            >
              <DrawingCanvas data={item.data} />
              <View style={styles.metaRow}>
                <AppText variant="bodySemibold">
                  {item.isMine ? "From you" : `From ${partner}`}
                </AppText>
                <AppText color="muted" variant="caption">
                  {new Date(item.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </AppText>
              </View>
            </Pressable>
          )}
        />
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
  back: { fontSize: 34, lineHeight: 34, color: colors.text.primary },
  backSpacer: { width: 24 },
  list: { paddingTop: 8, paddingBottom: 24, gap: 20 },
  item: {
    gap: 10,
    backgroundColor: colors.surface.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: 12,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  empty: { textAlign: "center", marginTop: 40 },
});
