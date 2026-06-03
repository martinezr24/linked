import { useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AppTextInput } from "@/components/AppTextInput";
import { queryKeys } from "@/api/queryKeys";
import { fetchAsyncNotes } from "@/api/fetchers";
import { useRelationship } from "@/context/RelationshipContext";
import { apiFetch } from "@/utils/api";
import { showMutationError } from "@/utils/errors";
import type { AsyncNote } from "@/types";

const TRIGGERS = [
  { id: "anytime", label: "Surprise me anytime" },
  { id: "hard_day", label: "Open when you're having a hard day" },
  { id: "miss_me", label: "Open when you miss me" },
  { id: "happy", label: "Open when you're happy" },
];

function triggerLabel(type: string, value?: string) {
  const found = TRIGGERS.find((t) => t.id === type);
  if (found) return found.label;
  return value ?? type;
}

export function AsyncNotesCard() {
  const { deviceId } = useRelationship();
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");
  const [triggerType, setTriggerType] = useState("anytime");
  const [revealed, setRevealed] = useState<AsyncNote | null>(null);
  const [revealing, setRevealing] = useState(false);

  const { data: notes = [], isLoading } = useQuery({
    queryKey: queryKeys.asyncNotes,
    queryFn: () => fetchAsyncNotes(deviceId!),
    enabled: Boolean(deviceId),
  });

  const createNote = useMutation({
    mutationFn: async () => {
      const res = await apiFetch("/api/async-notes", deviceId!, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ triggerType, body: body.trim() }),
      });
      if (!res.ok) throw new Error("Failed to send note");
      return res.json() as Promise<AsyncNote>;
    },
    onSuccess: () => {
      setBody("");
      void queryClient.invalidateQueries({ queryKey: queryKeys.asyncNotes });
    },
    onError: () => showMutationError("Could not send your note. Try again."),
  });

  const unreceived = notes.filter((n) => !n.isMine && !n.openedAt);

  const openNote = async (note: AsyncNote) => {
    if (!deviceId) return;
    setRevealing(true);
    try {
      const res = await apiFetch(
        `/api/async-notes/${note.id}/open`,
        deviceId,
        { method: "POST" },
      );
      if (!res.ok) throw new Error("Failed to open note");
      const opened: AsyncNote = await res.json();
      setRevealed(opened);
      void queryClient.invalidateQueries({ queryKey: queryKeys.asyncNotes });
    } catch {
      showMutationError("Could not open this note.");
    } finally {
      setRevealing(false);
    }
  };

  if (isLoading) {
    return (
      <View style={styles.card}>
        <ActivityIndicator color="#000" />
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Open when…</Text>
      <Text style={styles.hint}>
        Leave a note for your partner to discover when they need it.
      </Text>

      {unreceived.length > 0 ? (
        <View style={styles.inbox}>
          <Text style={styles.inboxTitle}>
            {unreceived.length} note{unreceived.length === 1 ? "" : "s"} waiting
            for you
          </Text>
          {unreceived.map((note) => (
            <TouchableOpacity
              key={note.id}
              style={styles.revealButton}
              onPress={() => openNote(note)}
              disabled={revealing}
            >
              <Text style={styles.revealButtonText}>
                {triggerLabel(note.triggerType, note.triggerValue)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      <View style={styles.triggerRow}>
        {TRIGGERS.map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[
              styles.triggerChip,
              triggerType === t.id && styles.triggerChipActive,
            ]}
            onPress={() => setTriggerType(t.id)}
          >
            <Text
              style={[
                styles.triggerChipText,
                triggerType === t.id && styles.triggerChipTextActive,
              ]}
            >
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <AppTextInput
        style={styles.input}
        value={body}
        onChangeText={setBody}
        placeholder="Write something they'll treasure…"
        multiline
      />
      <TouchableOpacity
        style={[styles.button, !body.trim() && styles.buttonDisabled]}
        onPress={() => {
          Keyboard.dismiss();
          createNote.mutate();
        }}
        disabled={!body.trim() || createNote.isPending}
      >
        <Text style={styles.buttonText}>Send to partner</Text>
      </TouchableOpacity>

      <Modal visible={revealed !== null} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {revealed
                ? triggerLabel(revealed.triggerType, revealed.triggerValue)
                : ""}
            </Text>
            <Text style={styles.modalBody}>{revealed?.body}</Text>
            <TouchableOpacity
              style={styles.button}
              onPress={() => setRevealed(null)}
            >
              <Text style={styles.buttonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
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
  hint: { fontSize: 14, color: "#666", marginBottom: 12 },
  inbox: {
    backgroundColor: "#fdf6ec",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#f5e6c8",
  },
  inboxTitle: { fontWeight: "600", marginBottom: 8 },
  revealButton: {
    backgroundColor: "#000",
    padding: 12,
    borderRadius: 8,
    marginTop: 6,
  },
  revealButtonText: { color: "#fff", fontWeight: "600", textAlign: "center" },
  triggerRow: { flexWrap: "wrap", flexDirection: "row", gap: 8, marginBottom: 10 },
  triggerChip: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 4,
  },
  triggerChipActive: { backgroundColor: "#000", borderColor: "#000" },
  triggerChipText: { fontSize: 13, color: "#444" },
  triggerChipTextActive: { color: "#fff" },
  input: {
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    minHeight: 80,
    textAlignVertical: "top",
  },
  button: {
    backgroundColor: "#000",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  buttonDisabled: { backgroundColor: "#aaa" },
  buttonText: { color: "#fff", fontWeight: "700" },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: { fontSize: 18, fontWeight: "800", marginBottom: 16 },
  modalBody: { fontSize: 17, lineHeight: 26, marginBottom: 20, color: "#333" },
});
