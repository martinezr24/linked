import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";

import { AppTextInput } from "@/components/AppTextInput";
import { DatePickerField } from "@/components/DatePickerField";
import { AppText } from "@/components/ui/AppText";
import { ArtifactCard } from "@/components/ui/ArtifactCard";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { ScreenBackground } from "@/components/ui/ScreenBackground";
import { queryKeys } from "@/api/queryKeys";
import { fetchEvents } from "@/api/fetchers";
import { useRelationship } from "@/context/RelationshipContext";
import { apiFetch } from "@/utils/api";
import { dateToIso, formatMMDDYYYY } from "@/utils/dates";
import { showMutationError } from "@/utils/errors";
import { generateId } from "@/utils/id";
import { useTheme } from "@/theme/useTheme";
import type { SharedEvent } from "@/types";

export default function EventsScreen() {
  const theme = useTheme();
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

  const inputStyle = [
    styles.input,
    {
      backgroundColor: theme.colors.surface.input,
      borderColor: theme.colors.border.subtle,
      color: theme.colors.text.primary,
    },
  ];

  if (isLoading) {
    return (
      <ScreenBackground>
        <SafeAreaView style={[styles.safe, styles.centered]}>
          <ActivityIndicator size="large" color={theme.colors.accent.primary} />
        </SafeAreaView>
      </ScreenBackground>
    );
  }

  const listHeader = (
    <View style={styles.headerBlock}>
      <AppText variant="h1" style={styles.pageTitle}>
        Upcoming events
      </AppText>
      <AppText variant="body" color="secondary" style={styles.hint}>
        Shared dates you both should know about.
      </AppText>

      <ArtifactCard category="New event">
        <AppTextInput
          style={inputStyle}
          value={title}
          onChangeText={setTitle}
          placeholder="Event title"
          placeholderTextColor={theme.colors.text.muted}
          returnKeyType="next"
        />
        <DatePickerField
          label="Event date"
          value={eventDate}
          onChange={setEventDate}
        />
        <AppTextInput
          style={inputStyle}
          value={ownerLabel}
          onChangeText={setOwnerLabel}
          placeholder="Whose event? (optional)"
          placeholderTextColor={theme.colors.text.muted}
          returnKeyType="done"
          blurOnSubmit
        />
        <PrimaryButton
          label="Add event"
          onPress={handleAdd}
          disabled={!title.trim() || !eventDate}
        />
      </ArtifactCard>
    </View>
  );

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          ListHeaderComponent={listHeader}
          ListEmptyComponent={
            <AppText variant="body" color="muted" style={styles.empty}>
              No events yet.
            </AppText>
          }
          renderItem={({ item }) => (
            <View
              style={[
                styles.item,
                {
                  backgroundColor: theme.colors.surface.card,
                  borderColor: theme.colors.border.subtle,
                },
              ]}
            >
              <View style={styles.itemBody}>
                <AppText variant="bodySemibold">{item.title}</AppText>
                <AppText variant="body" color="secondary" style={styles.itemDate}>
                  {formatMMDDYYYY(item.eventAt)}
                </AppText>
                {item.ownerLabel ? (
                  <AppText variant="caption" color="muted">
                    {item.ownerLabel}
                  </AppText>
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
                  <AppText variant="bodySemibold" color="accent">
                    Plan this visit →
                  </AppText>
                </TouchableOpacity>
              </View>
              <TouchableOpacity onPress={() => deleteEvent.mutate(item.id)}>
                <AppText color="accent">✕</AppText>
              </TouchableOpacity>
            </View>
          )}
        />
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerBlock: { paddingHorizontal: 20, paddingTop: 8 },
  pageTitle: { marginBottom: 4, fontFamily: "DMSans_700Bold" },
  hint: { marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    fontSize: 16,
  },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 20, paddingBottom: 100 },
  empty: { textAlign: "center", marginTop: 24 },
  item: {
    flexDirection: "row",
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 1,
  },
  itemBody: { flex: 1 },
  itemDate: { marginTop: 4 },
  planButton: { marginTop: 10 },
});
