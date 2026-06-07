import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";

import { AsyncNotesCard } from "@/components/AsyncNotesCard";
import { DailyPhotoCard } from "@/components/photos/DailyPhotoCard";
import { PartnerPresenceCard } from "@/components/presence/PartnerPresenceCard";
import { VisitCountdownHero } from "@/components/VisitCountdownHero";
import { VisitEditSheet } from "@/components/VisitEditSheet";
import { WidgetPreviewCard } from "@/components/WidgetPreviewCard";
import { WeeklyGoalsCard } from "@/components/goals/WeeklyGoalsCard";
import { useCoupleNames } from "@/hooks/useCoupleNames";
import { initialFromName } from "@/utils/coupleNames";
import { AppText } from "@/components/ui/AppText";
import { ArtifactCard } from "@/components/ui/ArtifactCard";
import { TreatsModal } from "@/components/treats/TreatsModal";
import { ConnectedHeader } from "@/components/ui/ConnectedHeader";
import { TreatButton } from "@/components/ui/TreatButton";
import { ScreenBackground } from "@/components/ui/ScreenBackground";
import { queryKeys } from "@/api/queryKeys";
import {
  fetchEvents,
  fetchGoals,
  fetchRelationship,
  fetchPhotoToday,
} from "@/api/fetchers";
import { useRelationship } from "@/context/RelationshipContext";
import { apiFetch } from "@/utils/api";
import {
  dateToIso,
  formatMMDDYYYY,
  getDeviceTimezoneLabel,
} from "@/utils/dates";
import { showMutationError } from "@/utils/errors";
import { useTheme } from "@/theme/useTheme";
import type { SharedEvent } from "@/types";

function formatCountdown(targetIso: string): string {
  const target = new Date(targetIso).getTime();
  const now = Date.now();
  const diff = target - now;
  if (diff <= 0) {
    return "You're together now!";
  }
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) {
    return `${days} day${days === 1 ? "" : "s"}, ${hours} hour${hours === 1 ? "" : "s"}`;
  }
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours} hour${hours === 1 ? "" : "s"}, ${minutes} min`;
}

function countdownDays(targetIso: string): string {
  const diff = new Date(targetIso).getTime() - Date.now();
  if (diff <= 0) return "0";
  return String(Math.floor(diff / (1000 * 60 * 60 * 24)));
}

function nextUpcomingEvent(events: SharedEvent[]): SharedEvent | null {
  const now = Date.now();
  const upcoming = events
    .filter((e) => new Date(e.startAt || e.eventAt).getTime() >= now)
    .sort(
      (a, b) =>
        new Date(a.startAt || a.eventAt).getTime() -
        new Date(b.startAt || b.eventAt).getTime(),
    );
  return upcoming[0] ?? null;
}

const TAB_BAR_HEIGHT = Platform.OS === "ios" ? 88 : 64;

export default function HomeScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { deviceId } = useRelationship();
  const scrollBottomPad = TAB_BAR_HEIGHT + insets.bottom + 24;
  const queryClient = useQueryClient();
  const [visitDraft, setVisitDraft] = useState<Date | null>(null);
  const [visitSheetOpen, setVisitSheetOpen] = useState(false);
  const [goalsExpanded, setGoalsExpanded] = useState(false);
  const [treatsOpen, setTreatsOpen] = useState(false);
  const tzLabel = getDeviceTimezoneLabel();
  const { mineName, partnerName } = useCoupleNames();

  const enabled = Boolean(deviceId);

  const { data: relationship, isLoading: relLoading } = useQuery({
    queryKey: queryKeys.relationship,
    queryFn: () => fetchRelationship(deviceId!),
    enabled,
  });

  const { data: goals = [], isLoading: goalsLoading } = useQuery({
    queryKey: queryKeys.goals,
    queryFn: () => fetchGoals(deviceId!),
    enabled,
  });

  const { data: events = [], isLoading: eventsLoading } = useQuery({
    queryKey: queryKeys.events,
    queryFn: () => fetchEvents(deviceId!),
    enabled,
  });

  const { data: photoToday, isLoading: photoLoading } = useQuery({
    queryKey: queryKeys.photoToday,
    queryFn: () => fetchPhotoToday(deviceId!),
    enabled,
  });

  const nextVisitAt = relationship?.nextVisitAt ?? null;
  const loading =
    relLoading || goalsLoading || eventsLoading || photoLoading;

  const invalidateRelationship = () =>
    queryClient.invalidateQueries({ queryKey: queryKeys.relationship });

  const saveVisit = useMutation({
    mutationFn: async (date: Date) => {
      const nextVisitAtValue = dateToIso(date);
      const res = await apiFetch("/api/relationship/visit", deviceId!, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nextVisitAt: nextVisitAtValue }),
      });
      if (!res.ok) throw new Error("Failed to save visit");
      return res.json();
    },
    onSuccess: () => {
      setVisitDraft(null);
      void invalidateRelationship();
    },
    onError: () => showMutationError("Could not save visit date."),
  });

  const clearVisit = useMutation({
    mutationFn: async () => {
      const res = await apiFetch("/api/relationship/visit", deviceId!, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nextVisitAt: null }),
      });
      if (!res.ok) throw new Error("Failed to clear visit");
    },
    onSuccess: () => {
      setVisitDraft(null);
      void invalidateRelationship();
    },
    onError: () => showMutationError("Could not clear visit date."),
  });

  const upcoming = nextUpcomingEvent(events);
  const streakCount = photoToday?.currentStreak ?? 0;
  const bothSentPhotoToday = photoToday?.bothSentToday ?? false;

  useEffect(() => {
    if (goals.length > 0) setGoalsExpanded(true);
  }, [goals.length]);

  if (loading) {
    return (
      <ScreenBackground>
        <SafeAreaView style={[styles.centered, styles.safe]}>
          <ActivityIndicator size="large" color={theme.colors.accent.primary} />
        </SafeAreaView>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.flex}>
          <ConnectedHeader
            streakCount={streakCount}
            mineInitial={initialFromName(mineName, "M")}
            partnerInitial={initialFromName(partnerName, "Y")}
            minePhotoSent={Boolean(photoToday?.mine)}
            partnerPhotoSent={Boolean(photoToday?.partner)}
            headerRight={
              <TreatButton onPress={() => setTreatsOpen(true)} />
            }
          />
          <TreatsModal
            visible={treatsOpen}
            onClose={() => setTreatsOpen(false)}
            partnerName={partnerName ?? undefined}
          />

          <ScrollView
            style={styles.flex}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.scroll,
              { paddingBottom: scrollBottomPad },
            ]}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            {bothSentPhotoToday ? (
              <View
                style={[
                  styles.celebration,
                  {
                    backgroundColor: "rgba(230,57,70,0.12)",
                    borderColor: theme.colors.border.emphasis,
                  },
                ]}
              >
                <AppText variant="bodySemibold" color="accent">
                  Both sent today's photo — streak secured!
                </AppText>
              </View>
            ) : null}

            <DailyPhotoCard />

            <PartnerPresenceCard />

            <VisitCountdownHero
              nextVisitAt={nextVisitAt}
              tzLabel={tzLabel}
              formatCountdown={formatCountdown}
              countdownDays={countdownDays}
              onPress={() => setVisitSheetOpen(true)}
            />

            {upcoming ? (
              <TouchableOpacity
                style={styles.eventPeek}
                onPress={() =>
                  router.push({
                    pathname: "/visit/[eventId]",
                    params: {
                      eventId: upcoming.id,
                      title: upcoming.title,
                      eventAt: upcoming.startAt || upcoming.eventAt,
                    },
                  })
                }
              >
                <AppText variant="caption" color="secondary">
                  UPCOMING EVENT
                </AppText>
                <AppText variant="bodySemibold" color="accent">
                  {upcoming.title} · {formatMMDDYYYY(upcoming.startAt || upcoming.eventAt)}
                </AppText>
              </TouchableOpacity>
            ) : null}

            <View style={styles.quickRow}>
              <View style={styles.quickCard}>
                <WidgetPreviewCard compact />
              </View>
              <TouchableOpacity
                style={[
                  styles.quickCard,
                  styles.miniCard,
                  {
                    backgroundColor: theme.colors.surface.card,
                    borderColor: theme.colors.border.subtle,
                  },
                ]}
                onPress={() => router.push("/plans")}
              >
                <AppText variant="label" color="secondary">
                  PLANS
                </AppText>
                <AppText variant="h2" style={styles.miniTitle}>
                  Shared lists
                </AppText>
                <AppText variant="body" color="muted" numberOfLines={2}>
                  Together ideas →
                </AppText>
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <AsyncNotesCard />
            </View>

            <WeeklyGoalsCard
              goals={goals}
              expanded={goalsExpanded}
              onToggleExpanded={() => setGoalsExpanded((e) => !e)}
            />
          </ScrollView>

          <VisitEditSheet
            visible={visitSheetOpen}
            onClose={() => setVisitSheetOpen(false)}
            visitDraft={visitDraft}
            onChangeDraft={setVisitDraft}
            hasVisit={Boolean(nextVisitAt)}
            saving={saveVisit.isPending}
            onSave={() => {
              if (visitDraft) {
                saveVisit.mutate(visitDraft, {
                  onSuccess: () => setVisitSheetOpen(false),
                });
              }
            }}
            onClear={() => {
              clearVisit.mutate(undefined, {
                onSuccess: () => setVisitSheetOpen(false),
              });
            }}
          />
        </View>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { paddingTop: 4 },
  section: { paddingHorizontal: 20 },
  celebration: {
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  eventPeek: {
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  quickRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 8,
    alignItems: "stretch",
  },
  quickCard: {
    flex: 1,
    minWidth: 0,
  },
  miniCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    justifyContent: "center",
    minHeight: 120,
  },
  miniTitle: { marginVertical: 8 },
  goalInputRow: { flexDirection: "row", marginBottom: 12, gap: 8 },
  goalInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
  addGoalBtn: { alignSelf: "stretch", justifyContent: "center" },
  goalRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },
  goalCheckArea: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  checkbox: { fontSize: 18 },
  goalDone: { textDecorationLine: "line-through", opacity: 0.5 },
});
