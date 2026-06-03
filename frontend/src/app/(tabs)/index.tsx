import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { type Href, Link, router } from "expo-router";

import { AppTextInput } from "@/components/AppTextInput";
import { DatePickerField } from "@/components/DatePickerField";
import { DismissKeyboardView } from "@/components/DismissKeyboardView";
import { useRelationship } from "@/context/RelationshipContext";
import { apiFetch } from "@/utils/api";
import {
  dateToIso,
  formatLocalDateLabel,
  formatMMDDYYYY,
  getDeviceTimezoneLabel,
} from "@/utils/dates";
import type { SharedEvent, TodayCheckIns, WeeklyGoal } from "@/types";

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
  const { deviceId, subscribe, sendMessage } = useRelationship();
  const [nextVisitAt, setNextVisitAt] = useState<string | null>(null);
  const [visitDraft, setVisitDraft] = useState<Date | null>(null);
  const [goals, setGoals] = useState<WeeklyGoal[]>([]);
  const [events, setEvents] = useState<SharedEvent[]>([]);
  const [checkIns, setCheckIns] = useState<TodayCheckIns>({
    mine: null,
    partner: null,
  });
  const [checkInNote, setCheckInNote] = useState("");
  const [goalInput, setGoalInput] = useState("");
  const [loading, setLoading] = useState(true);
  const tzLabel = getDeviceTimezoneLabel();

  const loadAll = useCallback(async () => {
    if (!deviceId) return;
    setLoading(true);
    try {
      const [relRes, goalRes, eventsRes, checkRes] = await Promise.all([
        apiFetch("/api/relationship", deviceId),
        apiFetch("/api/goals/current", deviceId),
        apiFetch("/api/events", deviceId),
        apiFetch("/api/checkins/today", deviceId),
      ]);
      if (relRes.ok) {
        const rel = await relRes.json();
        setNextVisitAt(rel.nextVisitAt ?? null);
      }
      if (goalRes.ok) {
        const g: WeeklyGoal[] = await goalRes.json();
        setGoals(Array.isArray(g) ? g : []);
      }
      if (eventsRes.ok) {
        const ev: SharedEvent[] = await eventsRes.json();
        setEvents(Array.isArray(ev) ? ev : []);
      }
      if (checkRes.ok) {
        const c: TodayCheckIns = await checkRes.json();
        setCheckIns(c);
      }
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    return subscribe((msg) => {
      if (msg.action === "SET_NEXT_VISIT") {
        const at = msg.payload.nextVisitAt as string | null | undefined;
        setNextVisitAt(at ?? null);
      }
      if (msg.action === "ADD_WEEKLY_GOAL") {
        const g = msg.payload.goal as WeeklyGoal;
        setGoals((prev) =>
          prev.some((x) => x.id === g.id) ? prev : [...prev, g],
        );
      }
      if (msg.action === "UPDATE_WEEKLY_GOAL") {
        const g = msg.payload.goal as WeeklyGoal;
        setGoals((prev) => prev.map((x) => (x.id === g.id ? g : x)));
      }
      if (msg.action === "DELETE_WEEKLY_GOAL") {
        const id = msg.payload.id as string;
        setGoals((prev) => prev.filter((x) => x.id !== id));
      }
      if (msg.action === "CHECK_IN") {
        void (async () => {
          const res = await apiFetch("/api/checkins/today", deviceId);
          if (res.ok) {
            const c: TodayCheckIns = await res.json();
            setCheckIns(c);
          }
        })();
      }
      if (msg.action === "ADD_EVENT") {
        const ev = msg.payload as unknown as SharedEvent;
        setEvents((prev) =>
          prev.some((e) => e.id === ev.id)
            ? prev
            : [...prev, ev].sort(
                (a, b) =>
                  new Date(a.eventAt).getTime() -
                  new Date(b.eventAt).getTime(),
              ),
        );
      }
    });
  }, [deviceId, subscribe]);

  const saveVisit = async () => {
    if (!deviceId || !visitDraft) return;

    const nextVisitAtValue = dateToIso(visitDraft);

    const res = await apiFetch("/api/relationship/visit", deviceId, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nextVisitAt: nextVisitAtValue }),
    });
    if (res.ok) {
      const data = await res.json();
      setNextVisitAt(data.nextVisitAt ?? null);
      setVisitDraft(null);
      sendMessage("SET_NEXT_VISIT", { nextVisitAt: nextVisitAtValue });
    }
  };

  const clearVisit = async () => {
    if (!deviceId) return;
    const res = await apiFetch("/api/relationship/visit", deviceId, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nextVisitAt: null }),
    });
    if (res.ok) {
      setNextVisitAt(null);
      setVisitDraft(null);
      sendMessage("SET_NEXT_VISIT", { nextVisitAt: null });
    }
  };

  const addGoal = async () => {
    if (!deviceId || !goalInput.trim()) return;
    Keyboard.dismiss();
    const res = await apiFetch("/api/goals/current", deviceId, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goalText: goalInput.trim() }),
    });
    if (res.ok) {
      const g: WeeklyGoal = await res.json();
      setGoals((prev) => [...prev, g]);
      setGoalInput("");
      sendMessage("ADD_WEEKLY_GOAL", { goal: g });
    }
  };

  const toggleGoal = async (goal: WeeklyGoal) => {
    if (!deviceId) return;
    const res = await apiFetch(`/api/goals/${goal.id}`, deviceId, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !goal.done }),
    });
    if (res.ok) {
      const g: WeeklyGoal = await res.json();
      setGoals((prev) => prev.map((x) => (x.id === g.id ? g : x)));
      sendMessage("UPDATE_WEEKLY_GOAL", { goal: g });
    }
  };

  const deleteGoal = async (id: string) => {
    if (!deviceId) return;
    const res = await apiFetch(`/api/goals/${id}`, deviceId, {
      method: "DELETE",
    });
    if (res.ok) {
      setGoals((prev) => prev.filter((x) => x.id !== id));
      sendMessage("DELETE_WEEKLY_GOAL", { id });
    }
  };

  const sendCheckIn = async () => {
    if (!deviceId || checkIns.mine) return;
    Keyboard.dismiss();
    const res = await apiFetch("/api/checkins/today", deviceId, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        note: checkInNote.trim() || undefined,
      }),
    });
    if (res.ok) {
      const c: TodayCheckIns = await res.json();
      setCheckIns(c);
      setCheckInNote("");
      sendMessage("CHECK_IN", { checkIns: c });
    }
  };

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
          {checkIns.mine ? (
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
              <TouchableOpacity style={styles.button} onPress={sendCheckIn}>
                <Text style={styles.buttonText}>Send check-in</Text>
              </TouchableOpacity>
            </>
          )}
          <Text style={styles.checkInPartner}>
            {checkIns.partner
              ? `Partner checked in today${checkIns.partner.note ? `: “${checkIns.partner.note}”` : ""}`
              : "Partner hasn’t checked in yet today"}
          </Text>
          <Text style={styles.checkInResetHint}>
            Resets at midnight ({tzLabel})
          </Text>
        </View>

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
            onPress={saveVisit}
            disabled={!visitDraft}
          >
            <Text style={styles.buttonText}>Save visit date</Text>
          </TouchableOpacity>
          {nextVisitAt ? (
            <TouchableOpacity style={styles.clearButton} onPress={clearVisit}>
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
              onSubmitEditing={addGoal}
            />
            <TouchableOpacity
              style={[
                styles.addGoalButton,
                !goalInput.trim() && styles.buttonDisabled,
              ]}
              onPress={addGoal}
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
                  onPress={() => toggleGoal(goal)}
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
                <TouchableOpacity onPress={() => deleteGoal(goal.id)}>
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
