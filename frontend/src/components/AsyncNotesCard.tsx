import { useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AppTextInput } from "@/components/AppTextInput";
import { AppText } from "@/components/ui/AppText";
import { ArtifactCard } from "@/components/ui/ArtifactCard";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { ChevronDownIcon, EnvelopeIcon, LockIcon } from "@/components/ui/icons";
import { queryKeys } from "@/api/queryKeys";
import { fetchAsyncNotes } from "@/api/fetchers";
import { useRelationship } from "@/context/RelationshipContext";
import { apiFetch } from "@/utils/api";
import { showMutationError } from "@/utils/errors";
import { dateToIso, formatMMDDYYYY } from "@/utils/dates";
import { useTheme } from "@/theme/useTheme";
import type { AsyncNote } from "@/types";

const PRESET_TRIGGERS = [
  { id: "anytime", label: "Surprise me anytime" },
  { id: "hard_day", label: "Open when you're having a hard day" },
  { id: "miss_me", label: "Open when you miss me" },
  { id: "happy", label: "Open when you're happy" },
];

const CUSTOM_TRIGGER_ID = "custom";
const LOCK_TIME = "time";
const MAX_CUSTOM_LABEL = 80;

export function triggerLabel(note: Pick<AsyncNote, "triggerType" | "triggerValue" | "lockType" | "opensAt">) {
  if (note.lockType === "time" && note.opensAt) {
    return `Opens ${formatMMDDYYYY(note.opensAt)}`;
  }
  if (note.triggerType === CUSTOM_TRIGGER_ID && note.triggerValue) {
    return `Open when ${note.triggerValue}`;
  }
  const found = PRESET_TRIGGERS.find((t) => t.id === note.triggerType);
  if (found) return found.label;
  return note.triggerValue ?? note.triggerType;
}

export function AsyncNotesCard() {
  const theme = useTheme();
  const { deviceId } = useRelationship();
  const queryClient = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [body, setBody] = useState("");
  const [triggerType, setTriggerType] = useState("anytime");
  const [lockType, setLockType] = useState<"state" | "time">("state");
  const [opensAt, setOpensAt] = useState(
    () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  );
  const [customLabel, setCustomLabel] = useState("");
  const [revealed, setRevealed] = useState<AsyncNote | null>(null);
  const [revealing, setRevealing] = useState(false);

  const { data: notes = [], isLoading } = useQuery({
    queryKey: queryKeys.asyncNotes,
    queryFn: () => fetchAsyncNotes(deviceId!),
    enabled: Boolean(deviceId),
  });

  const unreceived = notes.filter(
    (n) => !n.isMine && !n.openedAt && (!n.isLocked || (n.lockType === "time" && n.opensAt && new Date(n.opensAt) <= new Date())),
  );
  const waitingLocked = notes.filter((n) => !n.isMine && n.isLocked && !n.openedAt);
  const isCustom = triggerType === CUSTOM_TRIGGER_ID;
  const isTimeLock = lockType === "time";
  const canSend =
    body.trim().length > 0 &&
    (isTimeLock || !isCustom || customLabel.trim().length > 0);

  const createNote = useMutation({
    mutationFn: async () => {
      const payload: {
        triggerType: string;
        body: string;
        lockType: "state" | "time";
        triggerValue?: string;
        opensAt?: string;
      } = {
        triggerType: isTimeLock ? "time" : triggerType,
        lockType,
        body: body.trim(),
      };
      if (isTimeLock) {
        payload.opensAt = dateToIso(opensAt);
      } else if (isCustom) {
        payload.triggerValue = customLabel.trim().slice(0, MAX_CUSTOM_LABEL);
      }
      const res = await apiFetch("/api/async-notes", deviceId!, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to send note");
      return res.json() as Promise<AsyncNote>;
    },
    onSuccess: () => {
      setBody("");
      setCustomLabel("");
      setTriggerType("anytime");
      setLockType("state");
      void queryClient.invalidateQueries({ queryKey: queryKeys.asyncNotes });
    },
    onError: () => showMutationError("Could not send your note. Try again."),
  });

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
      <View style={styles.loader}>
        <ActivityIndicator color={theme.colors.accent.primary} />
      </View>
    );
  }

  return (
    <ArtifactCard category="Open when">
      <Pressable
        style={styles.headerRow}
        onPress={() => setExpanded((e) => !e)}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <AppText variant="h2">Open when…</AppText>
        <View style={styles.headerRight}>
          {unreceived.length > 0 ? (
            <View
              style={[
                styles.badge,
                { borderColor: theme.colors.border.emphasis },
              ]}
            >
              <AppText variant="label" color="accent">
                {unreceived.length} waiting
              </AppText>
            </View>
          ) : null}
          <View style={styles.chevron}>
            {expanded ? (
              <ChevronDownIcon size={18} color={theme.colors.text.muted} />
            ) : (
              <EnvelopeIcon size={18} color={theme.colors.text.muted} />
            )}
          </View>
        </View>
      </Pressable>

      {expanded ? (
        <>
          <AppText variant="body" color="secondary" style={styles.hint}>
            Leave a note for your partner to discover when they need it.
          </AppText>

          {unreceived.length > 0 ? (
            <View
              style={[
                styles.inbox,
                {
                  backgroundColor: "rgba(230,57,70,0.08)",
                  borderColor: theme.colors.border.emphasis,
                },
              ]}
            >
              <AppText variant="bodySemibold" style={styles.inboxTitle}>
                {unreceived.length} note{unreceived.length === 1 ? "" : "s"}{" "}
                waiting for you
              </AppText>
              {unreceived.map((note) => (
                <PrimaryButton
                  key={note.id}
                  label={triggerLabel(note)}
                  onPress={() => openNote(note)}
                  style={styles.revealBtn}
                />
              ))}
            </View>
          ) : null}

          {waitingLocked.length > 0 ? (
            <View style={styles.lockedList}>
              {waitingLocked.map((note) => (
                <View key={note.id} style={styles.lockedRow}>
                  <LockIcon size={14} color={theme.colors.text.muted} />
                  <AppText variant="caption" color="muted">
                    {triggerLabel(note)}
                  </AppText>
                </View>
              ))}
            </View>
          ) : null}

          <View style={styles.lockRow}>
            <TouchableOpacity
              style={[
                styles.triggerChip,
                {
                  borderColor: theme.colors.border.subtle,
                  backgroundColor:
                    lockType === "state"
                      ? theme.colors.accent.primary
                      : "transparent",
                },
              ]}
              onPress={() => setLockType("state")}
            >
              <AppText
                variant="caption"
                style={{
                  color:
                    lockType === "state"
                      ? theme.colors.text.onAccent
                      : theme.colors.text.secondary,
                }}
              >
                Open when…
              </AppText>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.triggerChip,
                {
                  borderColor: theme.colors.border.subtle,
                  backgroundColor:
                    lockType === "time"
                      ? theme.colors.accent.primary
                      : "transparent",
                },
              ]}
              onPress={() => setLockType("time")}
            >
              <AppText
                variant="caption"
                style={{
                  color:
                    lockType === "time"
                      ? theme.colors.text.onAccent
                      : theme.colors.text.secondary,
                }}
              >
                Opens on a date
              </AppText>
            </TouchableOpacity>
          </View>

          {isTimeLock ? (
            <DateTimePicker
              value={opensAt}
              mode="date"
              minimumDate={new Date(Date.now() + 24 * 60 * 60 * 1000)}
              onChange={(_, d) => d && setOpensAt(d)}
              themeVariant="dark"
            />
          ) : (
          <View style={styles.triggerRow}>
            {PRESET_TRIGGERS.map((t) => (
              <TouchableOpacity
                key={t.id}
                style={[
                  styles.triggerChip,
                  {
                    borderColor: theme.colors.border.subtle,
                    backgroundColor:
                      triggerType === t.id
                        ? theme.colors.accent.primary
                        : "transparent",
                  },
                ]}
                onPress={() => setTriggerType(t.id)}
              >
                <AppText
                  variant="caption"
                  style={{
                    color:
                      triggerType === t.id
                        ? theme.colors.text.onAccent
                        : theme.colors.text.secondary,
                  }}
                >
                  {t.label}
                </AppText>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[
                styles.triggerChip,
                {
                  borderColor: theme.colors.border.subtle,
                  backgroundColor: isCustom
                    ? theme.colors.accent.primary
                    : "transparent",
                },
              ]}
              onPress={() => setTriggerType(CUSTOM_TRIGGER_ID)}
            >
              <AppText
                variant="caption"
                style={{
                  color: isCustom
                    ? theme.colors.text.onAccent
                    : theme.colors.text.secondary,
                }}
              >
                Custom…
              </AppText>
            </TouchableOpacity>
          </View>
          )}

          {isCustom && !isTimeLock ? (
            <AppTextInput
              style={[
                styles.customInput,
                {
                  backgroundColor: theme.colors.surface.input,
                  borderColor: theme.colors.border.subtle,
                  color: theme.colors.text.primary,
                },
              ]}
              value={customLabel}
              onChangeText={setCustomLabel}
              placeholder={'e.g. "we fight", "our anniversary"'}
              placeholderTextColor={theme.colors.text.muted}
              maxLength={MAX_CUSTOM_LABEL}
            />
          ) : null}

          <AppTextInput
            style={[
              styles.input,
              {
                backgroundColor: theme.colors.surface.input,
                borderColor: theme.colors.border.subtle,
                color: theme.colors.text.primary,
              },
            ]}
            value={body}
            onChangeText={setBody}
            placeholder="Write something they'll treasure…"
            placeholderTextColor={theme.colors.text.muted}
            multiline
          />
          <PrimaryButton
            label="Send to partner"
            onPress={() => {
              Keyboard.dismiss();
              createNote.mutate();
            }}
            disabled={!canSend}
            loading={createNote.isPending}
          />
        </>
      ) : null}

      <Modal visible={revealed !== null} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalCard,
              { backgroundColor: theme.colors.surface.card },
            ]}
          >
            <AppText variant="h2" style={styles.modalTitle}>
              {revealed ? triggerLabel(revealed) : ""}
            </AppText>
            <AppText display variant="body" style={styles.modalBody}>
              {revealed?.body ?? ""}
            </AppText>
            <PrimaryButton label="Close" onPress={() => setRevealed(null)} />
          </View>
        </View>
      </Modal>
    </ArtifactCard>
  );
}

const styles = StyleSheet.create({
  loader: { padding: 24, alignItems: "center" },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  chevron: { alignItems: "center", justifyContent: "center" },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  hint: { marginTop: 12, marginBottom: 12 },
  inbox: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  inboxTitle: { marginBottom: 8 },
  revealBtn: { marginTop: 6 },
  lockedList: { marginBottom: 12, gap: 6 },
  lockedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
  },
  lockRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  triggerRow: { flexWrap: "wrap", flexDirection: "row", gap: 8, marginBottom: 10 },
  triggerChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 4,
  },
  customInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    fontSize: 16,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
    minHeight: 80,
    textAlignVertical: "top",
    fontSize: 16,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  modalTitle: { marginBottom: 16 },
  modalBody: {
    lineHeight: 26,
    marginBottom: 20,
    fontFamily: "Fraunces_600SemiBold",
  },
});
