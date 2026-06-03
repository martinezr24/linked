import { useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  StyleSheet,
  Text,
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
      void queryClient.invalidateQueries({ queryKey: queryKeys.checkIns });
      void queryClient.invalidateQueries({ queryKey: queryKeys.streak });
    },
    onError: () => showMutationError("Could not send check-in."),
  });

  const upcoming = nextUpcomingEvent(events);
  const openGoals = goals.filter((g) => !g.done);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#000" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <DismissKeyboardView>
        <Text style={styles.title}>Linked</Text>
        <Text style={styles.subtitle}>Plan your time apart — and together.</Text>

        {streak && streak.currentStreak > 0 ? (
          <View style={styles.streakBanner}>
            <Text style={styles.streakText}>
              {streak.currentStreak}-day connection streak
              {streak.bothCheckedInToday ? " — both checked in today!" : ""}
            </Text>
          </View>
        ) : null}

        {(upcoming || openGoals.length > 0) && (
          <View style={styles.summaryCard}>
            <Text style={styles.cardTitle}>At a glance</Text>
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
                <Text style={styles.summaryLine}>
                  Next event: {upcoming.title} (
                  {formatMMDDYYYY(upcoming.eventAt)})
                </Text>
              </TouchableOpacity>
            ) : null}
            {openGoals.length > 0 ? (
              <Text style={styles.summaryLine}>
                {openGoals.length} open connection goal
                {openGoals.length === 1 ? "" : "s"} this week
              </Text>
            ) : null}
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Thinking of you</Text>
          {checkIns?.mine ? (
            <Text style={styles.checkInDone}>
              You checked in today
              {checkIns.mine.note ? `: “${checkIns.mine.note}”` : ""}
            </Text>
          ) : (
            <>
              <AppTextInput
                style={styles.input}
                value={checkInNote}
                onChangeText={setCheckInNote}
                placeholder="Optional note for your partner"
              />
              <TouchableOpacity
                style={styles.button}
                onPress={() => {
                  Keyboard.dismiss();
                  sendCheckIn.mutate(checkInNote.trim());
                }}
              >
                <Text style={styles.buttonText}>Send check-in</Text>
              </TouchableOpacity>
            </>
          )}
          <Text style={styles.checkInPartner}>
            {checkIns?.partner
              ? `Partner checked in today${checkIns.partner.note ? `: “${checkIns.partner.note}”` : ""}`
              : "Partner hasn’t checked in yet today"}
          </Text>
          <Text style={styles.checkInResetHint}>
            Resets at midnight ({tzLabel})
          </Text>
        </View>

        <AsyncNotesCard />

        <WidgetPreviewCard />

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Next visit</Text>
          {nextVisitAt ? (
            <>
              <Text style={styles.countdown}>
                {formatCountdown(nextVisitAt)}
                <Text style={styles.dateParen}>
                  {" "}
                  ({formatMMDDYYYY(nextVisitAt)})
                </Text>
              </Text>
              <Text style={styles.tzHint}>
                {formatLocalDateLabel(nextVisitAt)} · {tzLabel}
              </Text>
            </>
          ) : (
            <Text style={styles.muted}>Set a date to start the countdown</Text>
          )}
          <DatePickerField
            label="Pick a visit date"
            value={visitDraft}
            onChange={setVisitDraft}
            minimumDate={new Date()}
          />
          <TouchableOpacity
            style={[styles.button, !visitDraft && styles.buttonDisabled]}
            onPress={() => visitDraft && saveVisit.mutate(visitDraft)}
            disabled={!visitDraft}
          >
            <Text style={styles.buttonText}>Save visit date</Text>
          </TouchableOpacity>
          {nextVisitAt ? (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => clearVisit.mutate()}
            >
              <Text style={styles.clearButtonText}>Clear visit date</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>This week's connection</Text>
          <View style={styles.goalInputRow}>
            <AppTextInput
              style={styles.input}
              value={goalInput}
              onChangeText={setGoalInput}
              placeholder="e.g. FaceTime Friday night"
              returnKeyType="done"
              blurOnSubmit
              onSubmitEditing={() => {
                if (goalInput.trim()) addGoal.mutate(goalInput.trim());
              }}
            />
            <TouchableOpacity
              style={[
                styles.addGoalButton,
                !goalInput.trim() && styles.buttonDisabled,
              ]}
              onPress={() => {
                if (goalInput.trim()) addGoal.mutate(goalInput.trim());
              }}
              disabled={!goalInput.trim()}
            >
              <Text style={styles.addGoalButtonText}>Add</Text>
            </TouchableOpacity>
          </View>
          {goals.length === 0 ? (
            <Text style={styles.muted}>No goals yet — add one above.</Text>
          ) : (
            goals.map((goal) => (
              <View key={goal.id} style={styles.goalRow}>
                <TouchableOpacity
                  style={styles.goalCheckArea}
                  onPress={() => toggleGoal.mutate(goal)}
                >
                  <Text style={styles.checkbox}>{goal.done ? "☑" : "☐"}</Text>
                  <Text
                    style={[
                      styles.goalText,
                      goal.done && styles.goalTextDone,
                    ]}
                  >
                    {goal.goalText}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteGoal.mutate(goal.id)}>
                  <Text style={styles.goalDelete}>✕</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        <View style={styles.links}>
          <Link href={"/trip" as Href} style={styles.link}>
            Trip plans →
          </Link>
          <Link href={"/together" as Href} style={styles.link}>
            When we're together →
          </Link>
          <Link href={"/events" as Href} style={styles.link}>
            Upcoming events →
          </Link>
        </View>
      </DismissKeyboardView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9f9f9" },
  centered: { justifyContent: "center", alignItems: "center", padding: 20 },
  title: { fontSize: 32, fontWeight: "900", marginTop: 8, paddingHorizontal: 20 },
  subtitle: {
    fontSize: 15,
    color: "#666",
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  streakBanner: {
    backgroundColor: "#e8f5e9",
    borderRadius: 10,
    padding: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#c8e6c9",
  },
  streakText: { fontSize: 15, fontWeight: "600", color: "#2e7d32" },
  summaryCard: {
    backgroundColor: "#f0f4ff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: "#d8e0f5",
  },
  summaryLine: { fontSize: 15, color: "#333", marginTop: 6 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: "#eee",
  },
  cardTitle: { fontSize: 17, fontWeight: "700", marginBottom: 8 },
  countdown: { fontSize: 22, fontWeight: "800", marginBottom: 4 },
  dateParen: { fontSize: 18, fontWeight: "600", color: "#555" },
  tzHint: { fontSize: 13, color: "#666", marginBottom: 12 },
  muted: { color: "#888", marginBottom: 4 },
  checkInDone: { fontSize: 16, fontWeight: "600", marginBottom: 8 },
  checkInPartner: { fontSize: 14, color: "#666", marginTop: 10 },
  checkInResetHint: { fontSize: 12, color: "#aaa", marginTop: 6 },
  goalInputRow: { flexDirection: "row", marginBottom: 12 },
  input: {
    flex: 1,
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginRight: 10,
    marginBottom: 10,
  },
  button: {
    backgroundColor: "#000",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonDisabled: { backgroundColor: "#aaa" },
  buttonText: { color: "#fff", fontWeight: "700" },
  addGoalButton: {
    backgroundColor: "#000",
    paddingHorizontal: 16,
    justifyContent: "center",
    borderRadius: 8,
  },
  addGoalButtonText: { color: "#fff", fontWeight: "700" },
  clearButton: { marginTop: 10, alignItems: "center" },
  clearButtonText: { color: "#888", fontSize: 14 },
  goalRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#f0f0f0",
  },
  goalCheckArea: { flex: 1, flexDirection: "row", alignItems: "center" },
  checkbox: { fontSize: 22, marginRight: 10 },
  goalText: { fontSize: 16, flex: 1 },
  goalTextDone: { textDecorationLine: "line-through", color: "#888" },
  goalDelete: { color: "#c0392b", fontSize: 18, padding: 6 },
  links: { marginTop: 8, gap: 12, paddingHorizontal: 20, paddingBottom: 24 },
  link: { fontSize: 16, fontWeight: "600", color: "#000", marginBottom: 10 },
});
