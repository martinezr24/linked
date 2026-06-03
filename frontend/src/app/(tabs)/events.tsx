import { useState } from "react";
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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";

import { AppTextInput } from "@/components/AppTextInput";
import { DatePickerField } from "@/components/DatePickerField";
import { queryKeys } from "@/api/queryKeys";
import { fetchEvents } from "@/api/fetchers";
import { useRelationship } from "@/context/RelationshipContext";
import { apiFetch } from "@/utils/api";
import { dateToIso, formatMMDDYYYY } from "@/utils/dates";
import { showMutationError } from "@/utils/errors";
import { generateId } from "@/utils/id";
import type { SharedEvent } from "@/types";

export default function EventsScreen() {
  const { deviceId } = useRelationship();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [eventDate, setEventDate] = useState<Date | null>(null);
  const [ownerLabel, setOwnerLabel] = useState("");

  const { data: events = [], isLoading } = useQuery({
    queryKey: queryKeys.events,
    queryFn: () => fetchEvents(deviceId!),
    enabled: Boolean(deviceId),
  });

  const addEvent = useMutation({
    mutationFn: async (ev: SharedEvent) => {
      const res = await apiFetch("/api/events", deviceId!, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ev),
      });
      if (!res.ok) throw new Error("Failed to add event");
      return ev;
    },
    onSuccess: () => {
      setTitle("");
      setEventDate(null);
      setOwnerLabel("");
      void queryClient.invalidateQueries({ queryKey: queryKeys.events });
    },
    onError: () => showMutationError("Could not add event."),
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(`/api/events/${id}`, deviceId!, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete event");
    },
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: queryKeys.events }),
    onError: () => showMutationError("Could not delete event."),
  });

  const handleAdd = () => {
    if (!deviceId || !title.trim() || !eventDate) return;
    Keyboard.dismiss();
    const ev: SharedEvent = {
      id: generateId(),
      title: title.trim(),
      eventAt: dateToIso(eventDate),
      ...(ownerLabel.trim() ? { ownerLabel: ownerLabel.trim() } : {}),
    };
    addEvent.mutate(ev);
  };

  if (isLoading) {
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
            <TouchableOpacity onPress={() => deleteEvent.mutate(item.id)}>
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
