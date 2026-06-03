import { useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type Href, Link, router } from "expo-router";

import { AsyncNotesCard } from "@/components/AsyncNotesCard";
import { WidgetPreviewCard } from "@/components/WidgetPreviewCard";
import { AppTextInput } from "@/components/AppTextInput";
import { DatePickerField } from "@/components/DatePickerField";
import { DismissKeyboardView } from "@/components/DismissKeyboardView";
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
  formatLocalDateLabel,
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

export default function HomeScreen() {
  const theme = useTheme();
  const { deviceId } = useRelationship();
  const queryClient = useQueryClient();
  const [visitDraft, setVisitDraft] = useState<Date | null>(null);
  const [checkInNote, setCheckInNote] = useState("");
  const [goalInput, setGoalInput] = useState("");
  const tzLabel = getDeviceTimezoneLabel();

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
    },
    onError: () => showMutationError("Could not send check-in."),
  });

  const upcoming = nextUpcomingEvent(events);
  const openGoals = goals.filter((g) => !g.done);
  const streakCount = streak?.currentStreak ?? 0;

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
        <DismissKeyboardView>
          <ConnectedHeader
            streakCount={streakCount}
            mineCheckedIn={Boolean(checkIns?.mine)}
            partnerCheckedIn={Boolean(checkIns?.partner)}
          />

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
          >
            {streak?.bothCheckedInToday ? (
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

            {(upcoming || openGoals.length > 0) && (
              <View style={styles.section}>
                <ArtifactCard category="Featured" title="At a glance">
                  {upcoming ? (
                    <TouchableOpacity
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
                      <AppText variant="body">
                        Next event: {upcoming.title} (
                        {formatMMDDYYYY(upcoming.eventAt)})
                      </AppText>
                    </TouchableOpacity>
                  ) : null}
                  {openGoals.length > 0 ? (
                    <AppText variant="body" color="secondary" style={styles.glanceGap}>
                      {openGoals.length} open connection goal
                      {openGoals.length === 1 ? "" : "s"} this week
                    </AppText>
                  ) : null}
                </ArtifactCard>
              </View>
            )}

            <CoupleProgressCard
              checkIns={checkIns}
              note={checkInNote}
              onChangeNote={setCheckInNote}
              onSend={() => sendCheckIn.mutate(checkInNote.trim())}
              sending={sendCheckIn.isPending}
              tzLabel={tzLabel}
            />

            <ScrollView
              horizontal
              nestedScrollEnabled
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.hScroll}
              style={styles.hScrollWrap}
            >
              <View style={styles.hCard}>
                <WidgetPreviewCard compact />
              </View>
              <TouchableOpacity
                style={[
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
                <AppText variant="body" color="muted">
                  Trip & reunion →
                </AppText>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.section}>
              <AsyncNotesCard />
            </View>

            <View style={styles.section}>
              <ArtifactCard category="Visit" title="Next visit" stacked>
                {nextVisitAt ? (
                  <>
                    <AppText display variant="displayHero" style={styles.visitDays}>
                      {countdownDays(nextVisitAt)}
                    </AppText>
                    <AppText variant="caption" color="secondary" style={styles.visitLabel}>
                      DAYS UNTIL YOU'RE TOGETHER
                    </AppText>
                    <AppText variant="body" style={styles.visitSub}>
                      {formatCountdown(nextVisitAt)}
                    </AppText>
                    <AppText variant="label" color="muted">
                      {formatLocalDateLabel(nextVisitAt)} · {tzLabel}
                    </AppText>
                  </>
                ) : (
                  <AppText variant="body" color="muted">
                    Set a date to start the countdown
                  </AppText>
                )}
                <DatePickerField
                  label="Pick a visit date"
                  value={visitDraft}
                  onChange={setVisitDraft}
                  minimumDate={new Date()}
                />
                <PrimaryButton
                  label="Save visit date"
                  onPress={() => visitDraft && saveVisit.mutate(visitDraft)}
                  disabled={!visitDraft}
                  style={styles.visitBtn}
                />
                {nextVisitAt ? (
                  <PrimaryButton
                    label="Clear visit date"
                    variant="ghost"
                    onPress={() => clearVisit.mutate()}
                    style={styles.visitBtn}
                  />
                ) : null}
              </ArtifactCard>
            </View>

            <View style={styles.section}>
              <ArtifactCard
                category="This week"
                title="Connection goals"
                stacked
              >
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
            </View>

            <View style={styles.links}>
              <Link href={"/plans" as Href}>
                <AppText variant="bodySemibold" color="accent">
                  Shared plans →
                </AppText>
              </Link>
              <Link href={"/events" as Href}>
                <AppText variant="bodySemibold" color="accent">
                  Upcoming events →
                </AppText>
              </Link>
            </View>
          </ScrollView>
        </DismissKeyboardView>
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { paddingBottom: 32 },
  section: { paddingHorizontal: 20 },
  celebration: {
    marginHorizontal: 20,
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  glanceGap: { marginTop: 8 },
  hScrollWrap: { marginBottom: 8 },
  hScroll: { paddingHorizontal: 20, gap: 12 },
  hCard: { width: 200 },
  miniCard: {
    width: 160,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    justifyContent: "center",
  },
  miniTitle: { marginVertical: 8 },
  visitDays: {
    fontFamily: "Fraunces_700Bold",
    marginBottom: 4,
  },
  visitLabel: { marginBottom: 12 },
  visitSub: { marginBottom: 8 },
  visitBtn: { marginTop: 12 },
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
  links: { paddingHorizontal: 20, gap: 12, marginTop: 8 },
});
