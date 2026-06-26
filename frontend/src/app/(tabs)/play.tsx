import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";

import { queryKeys } from "@/api/queryKeys";
import { fetchGoals } from "@/api/fetchers";
import { AsyncNotesCard } from "@/components/AsyncNotesCard";
import { DismissKeyboardView } from "@/components/DismissKeyboardView";
import { SharedListSection } from "@/components/SharedListSection";
import { WeeklyGoalsCard } from "@/components/goals/WeeklyGoalsCard";
import { MyStatusCard } from "@/components/presence/MyStatusCard";
import { AppText } from "@/components/ui/AppText";
import { CoupleProgressCard } from "@/components/ui/CoupleProgressCard";
import { ScreenBackground } from "@/components/ui/ScreenBackground";
import { useDailyCheckIn } from "@/hooks/useDailyCheckIn";
import { useRelationship } from "@/context/RelationshipContext";
import { getDeviceTimezoneLabel } from "@/utils/dates";

function SectionLabel({ children }: { children: string }) {
  return (
    <AppText variant="label" color="secondary" style={styles.sectionLabel}>
      {children}
    </AppText>
  );
}

export default function PlayScreen() {
  const { deviceId } = useRelationship();
  const tzLabel = getDeviceTimezoneLabel();
  const {
    checkIns,
    note,
    setNote,
    sendCheckIn,
    sending,
    isLoading: checkInLoading,
  } = useDailyCheckIn();
  const [goalsExpanded, setGoalsExpanded] = useState(true);

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
            contentContainerStyle={styles.scroll}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <AppText variant="h1" style={styles.title}>
              Us
            </AppText>
            <AppText variant="body" color="secondary" style={styles.sub}>
              Rituals, notes, and plans that keep you close.
            </AppText>

            <SectionLabel>TODAY</SectionLabel>
            <View style={styles.group}>
              <MyStatusCard />
              {!checkInLoading ? (
                <CoupleProgressCard
                  checkIns={checkIns}
                  note={note}
                  onChangeNote={setNote}
                  onSend={sendCheckIn}
                  sending={sending}
                  tzLabel={tzLabel}
                />
              ) : null}
            </View>

            <SectionLabel>TOGETHER</SectionLabel>
            <View style={styles.group}>
              <AsyncNotesCard />
              <WeeklyGoalsCard
                goals={goals}
                expanded={goalsExpanded}
                onToggleExpanded={() => setGoalsExpanded((e) => !e)}
              />
            </View>

            <SectionLabel>PLANS</SectionLabel>
            <View style={styles.bleed}>
              <SharedListSection
                listType="reunion"
                title="When we're together"
                placeholder="Something to do together..."
                notePlaceholder="Optional note..."
              />
            </View>
          </ScrollView>
        </DismissKeyboardView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { padding: 20, paddingBottom: 100 },
  title: { marginBottom: 8 },
  sub: { marginBottom: 4 },
  sectionLabel: { marginTop: 24, marginBottom: 12 },
  group: { gap: 16 },
  bleed: { marginHorizontal: -20 },
});

