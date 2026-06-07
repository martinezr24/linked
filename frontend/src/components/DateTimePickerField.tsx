import { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";

import { AppText } from "@/components/ui/AppText";
import { colors } from "@/theme/tokens";
import { useTheme } from "@/theme/useTheme";
import {
  dateTimeToIso,
  formatDateTimeLabel,
  formatMMDDYYYY,
  isoToDateTime,
} from "@/utils/dates";

type Props = {
  label: string;
  value: Date | null;
  onChange: (date: Date) => void;
  mode?: "date" | "time" | "datetime";
  minimumDate?: Date;
};

function formatDisplay(value: Date | null, mode: Props["mode"]): string {
  if (!value) return mode === "time" ? "Select time" : "Select date";
  if (mode === "date") return formatMMDDYYYY(dateTimeToIso(value));
  if (mode === "time") {
    return value.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    });
  }
  return formatDateTimeLabel(value);
}

export function DateTimePickerField({
  label,
  value,
  onChange,
  mode = "datetime",
  minimumDate,
}: Props) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(value ?? new Date());

  const pickerMode =
    mode === "datetime" ? (Platform.OS === "ios" ? "datetime" : "date") : mode;

  const display = formatDisplay(value, mode);

  const openPicker = () => {
    setDraft(value ?? new Date());
    setOpen(true);
  };

  const onPickerChange = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS === "android") {
      setOpen(false);
      if (event.type === "set" && selected) {
        onChange(selected);
      }
      return;
    }
    if (selected) {
      setDraft(selected);
    }
  };

  const confirmIOS = () => {
    onChange(draft);
    setOpen(false);
  };

  if (Platform.OS === "web") {
    const inputType =
      mode === "time"
        ? "time"
        : mode === "date"
          ? "date"
          : "datetime-local";

    const webValue =
      mode === "time"
        ? value
          ? `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`
          : ""
        : value
          ? mode === "date"
            ? `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`
            : `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}T${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`
          : "";

    return (
      <View style={styles.wrap}>
        <AppText variant="bodySemibold" color="secondary" style={styles.label}>
          {label}
        </AppText>
        <input
          type={inputType}
          value={webValue}
          onChange={(e: { target: { value: string } }) => {
            const v = e.target.value;
            if (!v) return;
            if (mode === "time") {
              const [h, m] = v.split(":").map(Number);
              const next = value ? new Date(value) : new Date();
              next.setHours(h, m, 0, 0);
              onChange(next);
              return;
            }
            if (mode === "date") {
              const [y, mo, d] = v.split("-").map(Number);
              onChange(new Date(y, mo - 1, d));
              return;
            }
            onChange(isoToDateTime(new Date(v).toISOString()));
          }}
          style={{
            width: "100%",
            padding: 12,
            fontSize: 16,
            borderRadius: 8,
            border: `1px solid ${colors.border.subtle}`,
            boxSizing: "border-box",
            color: colors.text.primary,
            backgroundColor: colors.surface.input,
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <AppText variant="bodySemibold" color="secondary" style={styles.label}>
        {label}
      </AppText>
      <TouchableOpacity
        style={[
          styles.button,
          {
            backgroundColor: theme.colors.surface.input,
            borderColor: theme.colors.border.subtle,
          },
        ]}
        onPress={openPicker}
      >
        <AppText variant="body" color={value ? "primary" : "muted"}>
          {display}
        </AppText>
      </TouchableOpacity>

      {Platform.OS === "ios" ? (
        <Modal visible={open} transparent animationType="slide">
          <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
            <Pressable
              style={[
                styles.sheet,
                { backgroundColor: theme.colors.surface.card },
              ]}
              onPress={(e) => e.stopPropagation()}
            >
              <View
                style={[
                  styles.sheetHeader,
                  { borderBottomColor: theme.colors.border.subtle },
                ]}
              >
                <TouchableOpacity onPress={() => setOpen(false)}>
                  <AppText variant="body" color="secondary">
                    Cancel
                  </AppText>
                </TouchableOpacity>
                <TouchableOpacity onPress={confirmIOS}>
                  <AppText variant="bodySemibold" color="accent">
                    Done
                  </AppText>
                </TouchableOpacity>
              </View>
              <View style={styles.pickerWrap}>
                <DateTimePicker
                  value={draft}
                  mode={pickerMode}
                  display="spinner"
                  themeVariant="dark"
                  textColor={theme.colors.text.primary}
                  accentColor={theme.colors.accent.primary}
                  minimumDate={minimumDate}
                  onChange={onPickerChange}
                  style={styles.picker}
                />
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}

      {Platform.OS === "android" && open ? (
        <DateTimePicker
          value={draft}
          mode={pickerMode}
          display="default"
          minimumDate={minimumDate}
          onChange={onPickerChange}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginBottom: 10 },
  label: { marginBottom: 6 },
  button: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
  },
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
  },
  pickerWrap: { paddingVertical: 8 },
  picker: {
    height: 216,
    width: "100%",
  },
});
