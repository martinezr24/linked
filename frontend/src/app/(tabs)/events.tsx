import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";

import { AppTextInput } from "@/components/AppTextInput";
import { DatePickerField } from "@/components/DatePickerField";
import { useRelationship } from "@/context/RelationshipContext";
import { apiFetch } from "@/utils/api";
import { dateToIso, formatMMDDYYYY } from "@/utils/dates";
import type { SharedEvent } from "@/types";

const generateId = () =>
  Date.now().toString(36) + Math.random().toString(36).substring(2);

export default function EventsScreen() {
  const { deviceId, sendMessage, subscribe } = useRelationship();
  const [events, setEvents] = useState<SharedEvent[]>([]);
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState<Date | null>(null);
  const [ownerLabel, setOwnerLabel] = useState("");
  const [loading, setLoading] = useState(true);

  const loadEvents = useCallback(async () => {
    if (!deviceId) return;
    setLoading(true);
    try {
      const res = await apiFetch("/api/events", deviceId);
      if (res.ok) {
        const data: SharedEvent[] = await res.json();
        setEvents(Array.isArray(data) ? data : []);
      }
    } finally {
      setLoading(false);
    }
  }, [deviceId]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    return subscribe((msg) => {
      if (msg.action === "ADD_EVENT") {
        const ev = msg.payload as unknown as SharedEvent;
        setEvents((prev) =>
          prev.some((e) => e.id === ev.id)
            ? prev
            : [...prev, ev].sort(
                (a, b) =>
                  new Date(a.eventAt).getTime() - new Date(b.eventAt).getTime(),
              ),
        );
      }
      if (msg.action === "DELETE_EVENT") {
        const id = msg.payload.id as string;
        setEvents((prev) => prev.filter((e) => e.id !== id));
      }
    });
  }, [subscribe]);

  const handleAdd = async () => {
    if (!deviceId || !title.trim() || !eventDate) return;
    Keyboard.dismiss();

    const eventAt = dateToIso(eventDate);
    const ev: SharedEvent = {
      id: generateId(),
      title: title.trim(),
      eventAt,
      ...(ownerLabel.trim() ? { ownerLabel: ownerLabel.trim() } : {}),
    };

    const res = await apiFetch("/api/events", deviceId, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ev),
    });

    if (res.ok) {
      setEvents((prev) =>
        [...prev, ev].sort(
          (a, b) =>
            new Date(a.eventAt).getTime() - new Date(b.eventAt).getTime(),
        ),
      );
      setTitle("");
      setEventDate(null);
      setOwnerLabel("");
      sendMessage("ADD_EVENT", ev as unknown as Record<string, unknown>);
    }
  };

  const handleDelete = async (id: string) => {
    if (!deviceId) return;
    const res = await apiFetch(`/api/events/${id}`, deviceId, {
      method: "DELETE",
    });
    if (res.ok) {
      setEvents((prev) => prev.filter((e) => e.id !== id));
      sendMessage("DELETE_EVENT", { id });
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#000" />
      </SafeAreaView>
    );
  }

  const listHeader = (
    <View>
      <Text style={styles.header}>Upcoming events</Text>
      <Text style={styles.hint}>Shared dates you both should know about.</Text>

      <AppTextInput
        style={styles.input}
        value={title}
        onChangeText={setTitle}
        placeholder="Event title"
        returnKeyType="next"
      />
      <DatePickerField
        label="Event date"
        value={eventDate}
        onChange={setEventDate}
      />
      <AppTextInput
        style={styles.input}
        value={ownerLabel}
        onChangeText={setOwnerLabel}
        placeholder="Whose event? (optional)"
        returnKeyType="done"
        blurOnSubmit
      />
      <TouchableOpacity
        style={[
          styles.button,
          (!title.trim() || !eventDate) && styles.buttonDisabled,
        ]}
        onPress={handleAdd}
        disabled={!title.trim() || !eventDate}
      >
        <Text style={styles.buttonText}>Add event</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        ListHeaderComponent={listHeader}
        ListEmptyComponent={<Text style={styles.empty}>No events yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <View style={styles.itemBody}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemDate}>
                {formatMMDDYYYY(item.eventAt)}
              </Text>
              {item.ownerLabel ? (
                <Text style={styles.itemOwner}>{item.ownerLabel}</Text>
              ) : null}
              <TouchableOpacity
                style={styles.planButton}
                onPress={() =>
                  router.push({
                    pathname: "/visit/[eventId]",
                    params: {
                      eventId: item.id,
                      title: item.title,
                      eventAt: item.eventAt,
                    },
                  })
                }
              >
                <Text style={styles.planButtonText}>Plan this visit →</Text>
              </TouchableOpacity>
            </View>
            <TouchableOpacity onPress={() => handleDelete(item.id)}>
              <Text style={styles.delete}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f9f9f9", padding: 20 },
  centered: { justifyContent: "center", alignItems: "center" },
  header: { fontSize: 26, fontWeight: "800", marginBottom: 4 },
  hint: { color: "#666", marginBottom: 16 },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  button: {
    backgroundColor: "#000",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 16,
  },
  buttonDisabled: { backgroundColor: "#ccc" },
  buttonText: { color: "#fff", fontWeight: "700" },
  list: { flex: 1 },
  listContent: { paddingBottom: 24 },
  empty: { textAlign: "center", color: "#888", marginTop: 24 },
  item: {
    flexDirection: "row",
    backgroundColor: "#fff",
    padding: 14,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#eee",
  },
  itemBody: { flex: 1 },
  itemTitle: { fontSize: 16, fontWeight: "700" },
  itemDate: { color: "#444", marginTop: 4 },
  itemOwner: { color: "#888", marginTop: 2, fontSize: 13 },
  delete: { color: "#c0392b", fontSize: 18, fontWeight: "700", padding: 4 },
  planButton: { marginTop: 10 },
  planButtonText: { color: "#000", fontWeight: "700", fontSize: 14 },
});
