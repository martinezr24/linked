import { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import DateTimePicker, {
  type DateTimePickerEvent,
} from "@react-native-community/datetimepicker";

import { dateToIso, formatMMDDYYYY } from "@/utils/dates";

type Props = {
  label: string;
  value: Date | null;
  onChange: (date: Date) => void;
  minimumDate?: Date;
};

export function DatePickerField({
  label,
  value,
  onChange,
  minimumDate,
}: Props) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(value ?? new Date());

  const display = value ? formatMMDDYYYY(dateToIso(value)) : "Select date";

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
    const webValue = value
      ? `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`
      : "";

    return (
      <View style={styles.wrap}>
        <Text style={styles.label}>{label}</Text>
        <input
          type="date"
          value={webValue}
          onChange={(e: { target: { value: string } }) => {
            const v = e.target.value;
            if (!v) return;
            const [y, m, d] = v.split("-").map(Number);
            onChange(new Date(y, m - 1, d));
          }}
          style={{
            width: "100%",
            padding: 12,
            fontSize: 16,
            borderRadius: 8,
            border: "1px solid #ddd",
            boxSizing: "border-box",
          }}
        />
        {value ? (
          <Text style={styles.preview}>{formatMMDDYYYY(dateToIso(value))}</Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <TouchableOpacity style={styles.button} onPress={openPicker}>
        <Text style={styles.buttonText}>{display}</Text>
      </TouchableOpacity>

      {Platform.OS === "ios" ? (
        <Modal visible={open} transparent animationType="slide">
          <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
            <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
              <View style={styles.sheetHeader}>
                <TouchableOpacity onPress={() => setOpen(false)}>
                  <Text style={styles.cancel}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={confirmIOS}>
                  <Text style={styles.done}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={draft}
                mode="date"
                display="spinner"
                minimumDate={minimumDate}
                onChange={onPickerChange}
              />
            </Pressable>
          </Pressable>
        </Modal>
      ) : null}

      {Platform.OS === "android" && open ? (
        <DateTimePicker
          value={draft}
          mode="date"
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
  label: { fontSize: 14, fontWeight: "600", marginBottom: 6, color: "#444" },
  button: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
  },
  buttonText: { fontSize: 16, color: "#000" },
  preview: { marginTop: 4, fontSize: 13, color: "#666" },
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 24,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  cancel: { fontSize: 16, color: "#666" },
  done: { fontSize: 16, fontWeight: "700", color: "#000" },
});
