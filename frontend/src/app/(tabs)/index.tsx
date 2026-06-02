import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { type Href, Link } from "expo-router";

import { useRelationship } from "@/context/RelationshipContext";
import { apiFetch } from "@/utils/api";
import type { WeeklyGoal } from "@/types";

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

export default function HomeScreen() {
  const { deviceId, subscribe, sendMessage } = useRelationship();
  const [nextVisitAt, setNextVisitAt] = useState<string | null>(null);
  const [visitInput, setVisitInput] = useState("");
  const [goal, setGoal] = useState<WeeklyGoal>(null);
  const [goalInput, setGoalInput] = useState("");
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    if (!deviceId) return;
    setLoading(true);
    try {
      const [relRes, goalRes] = await Promise.all([
        apiFetch("/api/relationship", deviceId),
        apiFetch("/api/goals/current", deviceId),
      ]);
      if (relRes.ok) {
        const rel = await relRes.json();
        setNextVisitAt(rel.nextVisitAt ?? null);
        if (rel.nextVisitAt) {
          setVisitInput(rel.nextVisitAt.slice(0, 10));
        }
      }
      if (goalRes.ok) {
        const g: WeeklyGoal = await goalRes.json();
        setGoal(g);
        if (g?.goalText) setGoalInput(g.goalText);
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
      if (
        msg.action === "SET_WEEKLY_GOAL" ||
        msg.action === "TOGGLE_WEEKLY_GOAL"
      ) {
        loadAll();
      }
    });
  }, [subscribe, loadAll]);

  const saveVisit = async () => {
    if (!deviceId) return;
    const trimmed = visitInput.trim();
    const nextVisitAtValue = trimmed
      ? new Date(`${trimmed}T12:00:00`).toISOString()
      : null;

    const res = await apiFetch("/api/relationship/visit", deviceId, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nextVisitAt: nextVisitAtValue }),
    });
    if (res.ok) {
      const data = await res.json();
      setNextVisitAt(data.nextVisitAt ?? null);
      sendMessage("SET_NEXT_VISIT", { nextVisitAt: nextVisitAtValue });
    }
  };

  const saveGoal = async () => {
    if (!deviceId || !goalInput.trim()) return;
    const res = await apiFetch("/api/goals/current", deviceId, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goalText: goalInput.trim() }),
    });
    if (res.ok) {
      const g = await res.json();
      setGoal(g);
      sendMessage("SET_WEEKLY_GOAL", { goalText: goalInput.trim() });
    }
  };

  const toggleGoal = async () => {
    if (!deviceId) return;
    const res = await apiFetch("/api/goals/current", deviceId, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !goal?.done, goalText: goal?.goalText ?? goalInput }),
    });
    if (res.ok) {
      const g = await res.json();
      setGoal(g);
      sendMessage("TOGGLE_WEEKLY_GOAL", {});
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#000" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <Text style={styles.title}>Linked</Text>
      <Text style={styles.subtitle}>Plan your time apart — and together.</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Next visit</Text>
        {nextVisitAt ? (
          <Text style={styles.countdown}>{formatCountdown(nextVisitAt)}</Text>
        ) : (
          <Text style={styles.muted}>Set a date to start the countdown</Text>
        )}
        <TextInput
          style={styles.input}
          value={visitInput}
          onChangeText={setVisitInput}
          placeholder="YYYY-MM-DD"
        />
        <TouchableOpacity style={styles.button} onPress={saveVisit}>
          <Text style={styles.buttonText}>Save visit date</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>This week's connection</Text>
        <TextInput
          style={styles.input}
          value={goalInput}
          onChangeText={setGoalInput}
          placeholder="e.g. FaceTime Friday night"
        />
        <TouchableOpacity style={styles.button} onPress={saveGoal}>
          <Text style={styles.buttonText}>Save goal</Text>
        </TouchableOpacity>
        {goal ? (
          <TouchableOpacity style={styles.goalRow} onPress={toggleGoal}>
            <Text style={styles.checkbox}>{goal.done ? "☑" : "☐"}</Text>
            <Text
              style={[styles.goalText, goal.done && styles.goalTextDone]}
            >
              {goal.goalText}
            </Text>
          </TouchableOpacity>
        ) : null}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9f9f9", padding: 20 },
  centered: { justifyContent: "center", alignItems: "center" },
  title: { fontSize: 32, fontWeight: "900", marginTop: 8 },
  subtitle: { fontSize: 15, color: "#666", marginBottom: 20 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#eee",
  },
  cardTitle: { fontSize: 17, fontWeight: "700", marginBottom: 8 },
  countdown: { fontSize: 22, fontWeight: "800", marginBottom: 12 },
  muted: { color: "#888", marginBottom: 12 },
  input: {
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  button: {
    backgroundColor: "#000",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonText: { color: "#fff", fontWeight: "700" },
  goalRow: { flexDirection: "row", alignItems: "center", marginTop: 14 },
  checkbox: { fontSize: 22, marginRight: 10 },
  goalText: { fontSize: 16, flex: 1 },
  goalTextDone: { textDecorationLine: "line-through", color: "#888" },
  links: { marginTop: 8, gap: 12 },
  link: { fontSize: 16, fontWeight: "600", color: "#000", marginBottom: 10 },
});
