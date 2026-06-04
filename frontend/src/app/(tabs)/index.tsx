import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Platform,
  Pressable,
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
import { VisitCountdownHero } from "@/components/VisitCountdownHero";
import { VisitEditSheet } from "@/components/VisitEditSheet";
import { WidgetPreviewCard } from "@/components/WidgetPreviewCard";
import { AppTextInput } from "@/components/AppTextInput";
import { DismissKeyboardView } from "@/components/DismissKeyboardView";
import { useCoupleNames } from "@/hooks/useCoupleNames";
import { initialFromName } from "@/utils/coupleNames";
import { AppText } from "@/components/ui/AppText";
import { ArtifactCard } from "@/components/ui/ArtifactCard";
import { ConnectedHeader } from "@/components/ui/ConnectedHeader";
import { CoupleProgressCard } from "@/components/ui/CoupleProgressCard";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { ScreenBackground } from "@/components/ui/ScreenBackground";
import { queryKeys } from "@/api/queryKeys";
import {
  fetchCheckIns,
  fetchEvents,
  fetchGoals,
  fetchRelationship,
  fetchStreak,
} from "@/api/fetchers";
import { useRelationship } from "@/context/RelationshipContext";
import { apiFetch } from "@/utils/api";
import {
  dateToIso,
  formatMMDDYYYY,
  getDeviceTimezoneLabel,
} from "@/utils/dates";
import { showMutationError } from "@/utils/errors";
import { hapticSuccess } from "@/utils/haptics";
import { useTheme } from "@/theme/useTheme";
import type { SharedEvent, WeeklyGoal } from "@/types";

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
    .filter((e) => new Date(e.eventAt).getTime() >= now)
    .sort(
      (a, b) =>
        new Date(a.eventAt).getTime() - new Date(b.eventAt).getTime(),
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
  const [checkInNote, setCheckInNote] = useState("");
  const [goalInput, setGoalInput] = useState("");
  const [goalsExpanded, setGoalsExpanded] = useState(false);
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

  const { data: checkIns, isLoading: checkInsLoading } = useQuery({
    queryKey: queryKeys.checkIns,
    queryFn: () => fetchCheckIns(deviceId!),
    enabled,
  });

  const { data: streak } = useQuery({
    queryKey: queryKeys.streak,
    queryFn: () => fetchStreak(deviceId!),
    enabled,
  });

  const nextVisitAt = relationship?.nextVisitAt ?? null;
  const loading =
    relLoading || goalsLoading || eventsLoading || checkInsLoading;

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

  const addGoal = useMutation({
    mutationFn: async (text: string) => {
      const res = await apiFetch("/api/goals/current", deviceId!, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goalText: text }),
      });
      if (!res.ok) throw new Error("Failed to add goal");
      return res.json() as Promise<WeeklyGoal>;
    },
    onSuccess: () => {
      setGoalInput("");
      void queryClient.invalidateQueries({ queryKey: queryKeys.goals });
    },
    onError: () => showMutationError("Could not add goal."),
  });

  const toggleGoal = useMutation({
    mutationFn: async (goal: WeeklyGoal) => {
      const res = await apiFetch(`/api/goals/${goal.id}`, deviceId!, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ done: !goal.done }),
      });
      if (!res.ok) throw new Error("Failed to update goal");
    },
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: queryKeys.goals }),
    onError: () => showMutationError("Could not update goal."),
  });

  const deleteGoal = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(`/api/goals/${id}`, deviceId!, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete goal");
    },
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: queryKeys.goals }),
    onError: () => showMutationError("Could not delete goal."),
  });

  const sendCheckIn = useMutation({
    mutationFn: async (note: string) => {
      const res = await apiFetch("/api/checkins/today", deviceId!, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: note || undefined }),
      });
      if (!res.ok) throw new Error("Failed to check in");
    },
    onSuccess: () => {
      setCheckInNote("");
      void hapticSuccess();
      void queryClient.invalidateQueries({ queryKey: queryKeys.checkIns });
      void queryClient.invalidateQueries({ queryKey: queryKeys.streak });
      void queryClient.invalidateQueries({ queryKey: queryKeys.widgetSummary });
    },
    onError: () => showMutationError("Could not send check-in."),
  });

  const upcoming = nextUpcomingEvent(events);
  const streakCount = streak?.currentStreak ?? 0;
  const bothCheckedInToday =
    Boolean(checkIns?.mine) && Boolean(checkIns?.partner);

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
        <DismissKeyboardView scroll={false} style={styles.flex}>
          <ConnectedHeader
            streakCount={streakCount}
            mineInitial={initialFromName(mineName, "M")}
            partnerInitial={initialFromName(partnerName, "Y")}
            mineCheckedIn={Boolean(checkIns?.mine)}
            partnerCheckedIn={Boolean(checkIns?.partner)}
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
            {bothCheckedInToday ? (
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
                  Both checked in today — your connection is strong.
                </AppText>
              </View>
            ) : null}

            <CoupleProgressCard
              checkIns={checkIns}
              note={checkInNote}
              onChangeNote={setCheckInNote}
              onSend={() => sendCheckIn.mutate(checkInNote.trim())}
              sending={sendCheckIn.isPending}
              tzLabel={tzLabel}
            />

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
                      eventAt: upcoming.eventAt,
                    },
                  })
                }
              >
                <AppText variant="caption" color="secondary">
                  UPCOMING EVENT
                </AppText>
                <AppText variant="bodySemibold" color="accent">
                  {upcoming.title} · {formatMMDDYYYY(upcoming.eventAt)}
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
                  Trip & reunion →
                </AppText>
              </TouchableOpacity>
            </View>

            <View style={styles.section}>
              <AsyncNotesCard />
            </View>

            <View style={styles.section}>
              <Pressable onPress={() => setGoalsExpanded((e) => !e)}>
                <AppText variant="label" color="secondary">
                  THIS WEEK {goalsExpanded ? "" : "(tap to expand)"}
                </AppText>
              </Pressable>
              {goalsExpanded ? (
              <ArtifactCard category="This week" title="Connection goals">
                <View style={styles.goalInputRow}>
                  <AppTextInput
                    style={[
                      styles.goalInput,
                      {
                        backgroundColor: theme.colors.surface.input,
                        borderColor: theme.colors.border.subtle,
                        color: theme.colors.text.primary,
                      },
                    ]}
                    value={goalInput}
                    onChangeText={setGoalInput}
                    placeholder="e.g. FaceTime Friday night"
                    placeholderTextColor={theme.colors.text.muted}
                    returnKeyType="done"
                    blurOnSubmit
                    onSubmitEditing={() => {
                      if (goalInput.trim()) addGoal.mutate(goalInput.trim());
                    }}
                  />
                  <PrimaryButton
                    label="Add"
                    onPress={() => {
                      if (goalInput.trim()) addGoal.mutate(goalInput.trim());
                    }}
                    disabled={!goalInput.trim()}
                    style={styles.addGoalBtn}
                  />
                </View>
                {goals.length === 0 ? (
                  <AppText variant="body" color="muted">
                    No goals yet — add one above.
                  </AppText>
                ) : (
                  goals.map((goal) => (
                    <View key={goal.id} style={styles.goalRow}>
                      <TouchableOpacity
                        style={styles.goalCheckArea}
                        onPress={() => toggleGoal.mutate(goal)}
                      >
                        <AppText style={styles.checkbox}>
                          {goal.done ? "🔥" : "○"}
                        </AppText>
                        <AppText
                          variant="body"
                          style={goal.done ? styles.goalDone : undefined}
                        >
                          {goal.goalText}
                        </AppText>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => deleteGoal.mutate(goal.id)}>
                        <AppText color="accent">✕</AppText>
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </ArtifactCard>
              ) : null}
            </View>
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
        </DismissKeyboardView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { flexGrow: 1 },
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
