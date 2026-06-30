import { RefreshControl, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { queryKeys } from "@/api/queryKeys";
import { fetchGoals } from "@/api/fetchers";
import { AsyncNotesCard } from "@/components/AsyncNotesCard";
import { DismissKeyboardView } from "@/components/DismissKeyboardView";
import { SharedListSection } from "@/components/SharedListSection";
import { WeeklyGoalsCard } from "@/components/goals/WeeklyGoalsCard";
import { MyStatusCard } from "@/components/presence/MyStatusCard";
import { AppText } from "@/components/ui/AppText";
import { ScreenBackground } from "@/components/ui/ScreenBackground";
import { useRelationship } from "@/context/RelationshipContext";
import { useTabReload } from "@/hooks/useTabReload";
import { colors } from "@/theme/tokens";

export default function PlayScreen() {
  const { deviceId } = useRelationship();
  const queryClient = useQueryClient();
  const { scrollRef, refreshing, onRefresh } = useTabReload(() =>
    queryClient.invalidateQueries(),
  );

  const { data: goals = [] } = useQuery({
    queryKey: queryKeys.goals,
    queryFn: () => fetchGoals(deviceId!),
    enabled: Boolean(deviceId),
  });

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <DismissKeyboardView>
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.text.secondary}
              />
            }
          >
            <View style={styles.intro}>
              <AppText variant="h1" style={styles.title}>
                Us
              </AppText>
              <AppText variant="body" color="secondary">
                Rituals, notes, and plans that keep you close.
              </AppText>
            </View>

            <MyStatusCard />

            <WeeklyGoalsCard goals={goals} />

            <View style={styles.cardWrap}>
              <AsyncNotesCard />
            </View>

            <SharedListSection
              listType="reunion"
              title="When we're together"
              description="A shared bucket list for your next reunion."
              placeholder="Something to do together..."
              notePlaceholder="Optional note..."
              stacked={false}
            />
          </ScrollView>
        </DismissKeyboardView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingTop: 8, paddingBottom: 100 },
  intro: { paddingHorizontal: 20, marginBottom: 16 },
  title: { marginBottom: 8 },
  cardWrap: { marginHorizontal: 20 },
});

