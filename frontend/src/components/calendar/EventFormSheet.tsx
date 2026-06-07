import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppTextInput } from "@/components/AppTextInput";
import { DatePickerField } from "@/components/DatePickerField";
import { DateTimePickerField } from "@/components/DateTimePickerField";
import { EventOwnerPicker } from "@/components/calendar/EventOwnerPicker";
import { AppText } from "@/components/ui/AppText";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { useTheme } from "@/theme/useTheme";
import {
  allDayRangeIso,
  dateTimeToIso,
  eventEndIso,
  eventStartIso,
  isoToAllDayDate,
  isoToDate,
  isoToDateTime,
  isEndBeforeStart,
  localDateString,
  toLocalCalendarDate,
} from "@/utils/dates";
import type { EventOwnerType, SharedEvent } from "@/types";

type Props = {
  visible: boolean;
  initial?: SharedEvent | null;
  defaultDate?: string;
  onClose: () => void;
  onSave: (event: SharedEvent) => void;
  onDelete?: (id: string) => void;
  saving?: boolean;
  deleting?: boolean;
};

export function EventFormSheet({
  visible,
  initial,
  defaultDate,
  onClose,
  onSave,
  onDelete,
  saving,
  deleting,
}: Props) {
  const theme = useTheme();
  const [title, setTitle] = useState("");
  const [allDay, setAllDay] = useState(true);
  const [startAt, setStartAt] = useState<Date | null>(null);
  const [endAt, setEndAt] = useState<Date | null>(null);
  const [ownerType, setOwnerType] = useState<EventOwnerType>("shared");
  const [description, setDescription] = useState("");
  const wasVisible = useRef(false);

  useEffect(() => {
    if (!visible) {
      wasVisible.current = false;
      return;
    }
    const justOpened = !wasVisible.current;
    wasVisible.current = true;
    if (!justOpened) return;

    if (initial) {
      setTitle(initial.title);
      setAllDay(initial.allDay ?? true);
      const startIso = eventStartIso(initial);
      const endIso = eventEndIso(initial);
      if (initial.allDay ?? true) {
        setStartAt(isoToAllDayDate(startIso));
        setEndAt(isoToAllDayDate(endIso));
      } else {
        setStartAt(isoToDateTime(startIso));
        setEndAt(isoToDateTime(endIso));
      }
      setOwnerType(initial.ownerType ?? "shared");
      setDescription(initial.description ?? "");
    } else {
      setTitle("");
      setAllDay(true);
      setOwnerType("shared");
      setDescription("");
      const base = defaultDate
        ? isoToDate(`${defaultDate}T12:00:00.000Z`)
        : new Date();
      setStartAt(base);
      setEndAt(base);
    }
  }, [visible, initial, defaultDate]);

  const inputStyle = [
    styles.input,
    {
      backgroundColor: theme.colors.surface.input,
      borderColor: theme.colors.border.subtle,
      color: theme.colors.text.primary,
    },
  ];

  const endInvalid =
    startAt && endAt ? isEndBeforeStart(startAt, endAt, allDay) : false;

  const handleSave = () => {
    if (!title.trim() || !startAt || endInvalid) return;
    Keyboard.dismiss();

    const end = endAt ?? startAt;
    const { startAt: s, endAt: e } = allDay
      ? allDayRangeIso(startAt, end)
      : {
          startAt: dateTimeToIso(startAt),
          endAt: dateTimeToIso(end),
        };

    onSave({
      id: initial?.id ?? "",
      title: title.trim(),
      eventAt: s,
      startAt: s,
      endAt: e,
      allDay,
      ownerType,
      ...(description.trim() ? { description: description.trim() } : {}),
    });
  };

  const handleDelete = () => {
    if (!initial?.id || !onDelete) return;
    Alert.alert(
      "Delete event?",
      `Remove "${initial.title}" from your shared calendar?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => onDelete(initial.id),
        },
      ],
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide">
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { backgroundColor: theme.colors.surface.card }]}
          onPress={(e) => e.stopPropagation()}
        >
          <SafeAreaView edges={["bottom"]}>
            <View
              style={[
                styles.header,
                { borderBottomColor: theme.colors.border.subtle },
              ]}
            >
              <TouchableOpacity onPress={onClose}>
                <AppText variant="body" color="secondary">
                  Cancel
                </AppText>
              </TouchableOpacity>
              <AppText variant="bodySemibold">
                {initial ? "Edit event" : "New event"}
              </AppText>
              <View style={styles.headerSpacer} />
            </View>

            <ScrollView
              contentContainerStyle={styles.body}
              keyboardShouldPersistTaps="handled"
            >
              <AppTextInput
                style={inputStyle}
                value={title}
                onChangeText={setTitle}
                placeholder="Event title"
                placeholderTextColor={theme.colors.text.muted}
              />

              <View style={styles.allDayRow}>
                <AppText variant="bodySemibold">All day</AppText>
                <Switch
                  value={allDay}
                  onValueChange={(next) => {
                    setAllDay(next);
                    if (!next && startAt) {
                      const nextStart = new Date(startAt);
                      if (
                        nextStart.getHours() === 0 &&
                        nextStart.getMinutes() === 0
                      ) {
                        nextStart.setHours(9, 0, 0, 0);
                      }
                      setStartAt(nextStart);
                      const nextEnd = endAt ? new Date(endAt) : new Date(nextStart);
                      if (
                        nextEnd.getHours() === 0 &&
                        nextEnd.getMinutes() === 0
                      ) {
                        nextEnd.setTime(nextStart.getTime());
                        nextEnd.setHours(nextStart.getHours() + 1, 0, 0, 0);
                      } else if (nextEnd.getTime() <= nextStart.getTime()) {
                        nextEnd.setTime(nextStart.getTime());
                        nextEnd.setHours(nextStart.getHours() + 1, 0, 0, 0);
                      }
                      setEndAt(nextEnd);
                    }
                  }}
                  trackColor={{
                    false: theme.colors.surface.input,
                    true: theme.colors.accent.primaryMuted,
                  }}
                  thumbColor={
                    allDay
                      ? theme.colors.accent.primary
                      : theme.colors.text.muted
                  }
                />
              </View>

              {allDay ? (
                <>
                  <DatePickerField
                    label="Start date"
                    value={startAt}
                    onChange={(d) => {
                      const next = toLocalCalendarDate(d);
                      setStartAt(next);
                      if (
                        endAt &&
                        localDateString(endAt) < localDateString(next)
                      ) {
                        setEndAt(next);
                      }
                    }}
                  />
                  <DatePickerField
                    label="End date"
                    value={endAt}
                    onChange={(d) => setEndAt(toLocalCalendarDate(d))}
                    minimumDate={startAt ?? undefined}
                  />
                </>
              ) : (
                <>
                  <DateTimePickerField
                    label="Starts"
                    value={startAt}
                    onChange={setStartAt}
                    mode="datetime"
                  />
                  <DateTimePickerField
                    label="Ends"
                    value={endAt}
                    onChange={setEndAt}
                    mode="datetime"
                    minimumDate={startAt ?? undefined}
                  />
                </>
              )}

              {endInvalid ? (
                <AppText variant="caption" color="accent" style={styles.error}>
                  {allDay
                    ? "End date must be on or after start date."
                    : "End must be after start."}
                </AppText>
              ) : null}

              <EventOwnerPicker value={ownerType} onChange={setOwnerType} />

              <AppTextInput
                style={[inputStyle, styles.textArea]}
                value={description}
                onChangeText={setDescription}
                placeholder="Notes (optional)"
                placeholderTextColor={theme.colors.text.muted}
                multiline
              />
              <PrimaryButton
                label={initial ? "Save changes" : "Add event"}
                onPress={handleSave}
                disabled={!title.trim() || !startAt || endInvalid}
                loading={saving}
              />
              {initial?.id && onDelete ? (
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={handleDelete}
                  disabled={deleting || saving}
                >
                  <AppText variant="bodySemibold" color="accent">
                    {deleting ? "Deleting…" : "Delete event"}
                  </AppText>
                </TouchableOpacity>
              ) : null}
            </ScrollView>
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: Platform.OS === "web" ? "90%" : "85%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerSpacer: { width: 48 },
  body: { padding: 20, paddingBottom: 32 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
    fontSize: 16,
  },
  textArea: { minHeight: 88, textAlignVertical: "top" },
  allDayRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  error: { marginBottom: 8 },
  deleteBtn: {
    marginTop: 16,
    alignItems: "center",
    paddingVertical: 12,
  },
});
