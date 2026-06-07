import { useEffect, useState } from "react";
import {
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppTextInput } from "@/components/AppTextInput";
import { DatePickerField } from "@/components/DatePickerField";
import { AppText } from "@/components/ui/AppText";
import { PrimaryButton } from "@/components/ui/PrimaryButton";
import { useTheme } from "@/theme/useTheme";
import { dateToIso, eventStartIso, isoToDate } from "@/utils/dates";
import type { SharedEvent } from "@/types";

type Props = {
  visible: boolean;
  initial?: SharedEvent | null;
  defaultDate?: string;
  onClose: () => void;
  onSave: (event: SharedEvent) => void;
  saving?: boolean;
};

export function EventFormSheet({
  visible,
  initial,
  defaultDate,
  onClose,
  onSave,
  saving,
}: Props) {
  const theme = useTheme();
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [ownerLabel, setOwnerLabel] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (!visible) return;
    if (initial) {
      setTitle(initial.title);
      setStartDate(isoToDate(eventStartIso(initial)));
      setEndDate(isoToDate(initial.endAt || eventStartIso(initial)));
      setOwnerLabel(initial.ownerLabel ?? "");
      setDescription(initial.description ?? "");
    } else {
      setTitle("");
      setOwnerLabel("");
      setDescription("");
      const base = defaultDate
        ? isoToDate(`${defaultDate}T12:00:00.000Z`)
        : new Date();
      setStartDate(base);
      setEndDate(base);
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

  const handleSave = () => {
    if (!title.trim() || !startDate) return;
    Keyboard.dismiss();
    const startAt = dateToIso(startDate);
    const endAt = dateToIso(endDate ?? startDate);
    onSave({
      id: initial?.id ?? "",
      title: title.trim(),
      eventAt: startAt,
      startAt,
      endAt,
      allDay: true,
      ...(ownerLabel.trim() ? { ownerLabel: ownerLabel.trim() } : {}),
      ...(description.trim() ? { description: description.trim() } : {}),
    });
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
              <DatePickerField
                label="Start date"
                value={startDate}
                onChange={setStartDate}
              />
              <DatePickerField
                label="End date"
                value={endDate}
                onChange={setEndDate}
                minimumDate={startDate ?? undefined}
              />
              <AppTextInput
                style={inputStyle}
                value={ownerLabel}
                onChangeText={setOwnerLabel}
                placeholder="Whose event? (optional)"
                placeholderTextColor={theme.colors.text.muted}
              />
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
                disabled={!title.trim() || !startDate}
                loading={saving}
              />
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
});
