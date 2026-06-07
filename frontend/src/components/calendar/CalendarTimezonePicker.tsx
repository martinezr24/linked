import { useMemo, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText } from "@/components/ui/AppText";
import { useCoupleNames } from "@/hooks/useCoupleNames";
import { useTheme } from "@/theme/useTheme";
import type { CalendarTimezoneMode } from "@/types";
import { formatTimezoneShort } from "@/utils/dates";
import { filterTimezones } from "@/utils/timezoneOptions";

type Props = {
  mode: CalendarTimezoneMode;
  customTz: string;
  partnerTz: string | null;
  activeLabel: string;
  partnerUnavailable: boolean;
  onModeChange: (mode: CalendarTimezoneMode) => void;
  onCustomTzChange: (tz: string) => void;
};

const MODES: CalendarTimezoneMode[] = ["device", "partner", "custom"];

export function CalendarTimezonePicker({
  mode,
  customTz,
  partnerTz,
  activeLabel,
  partnerUnavailable,
  onModeChange,
  onCustomTzChange,
}: Props) {
  const theme = useTheme();
  const { mineName, partnerName } = useCoupleNames();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [search, setSearch] = useState("");

  const labels: Record<CalendarTimezoneMode, string> = {
    device: mineName?.trim() ? mineName : "My time",
    partner: partnerName?.trim() ? partnerName : "Partner",
    custom: "Other",
  };

  const filteredZones = useMemo(() => filterTimezones(search), [search]);

  const openCustomPicker = () => {
    setSearch("");
    setPickerOpen(true);
    onModeChange("custom");
  };

  return (
    <View style={styles.wrap}>
      <AppText variant="caption" color="secondary" style={styles.heading}>
        TIME ZONE
      </AppText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {MODES.map((m) => {
          const selected = mode === m;
          const disabled = m === "partner" && !partnerTz;
          return (
            <Pressable
              key={m}
              disabled={disabled}
              onPress={() => {
                if (m === "custom") {
                  openCustomPicker();
                  return;
                }
                onModeChange(m);
              }}
              style={[
                styles.chip,
                {
                  backgroundColor: selected
                    ? theme.colors.surface.cardElevated
                    : theme.colors.surface.input,
                  borderColor: selected
                    ? theme.colors.accent.primaryMuted
                    : theme.colors.border.subtle,
                  opacity: disabled ? 0.45 : 1,
                },
              ]}
            >
              <AppText
                variant="caption"
                style={{
                  color: selected
                    ? theme.colors.text.primary
                    : theme.colors.text.secondary,
                  letterSpacing: 0.4,
                }}
              >
                {labels[m]}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>
      <AppText variant="caption" color="muted" style={styles.active}>
        {partnerUnavailable
          ? "Partner time unavailable — showing your time zone."
          : `Showing times in ${activeLabel}`}
      </AppText>

      <Modal visible={pickerOpen} transparent animationType="slide">
        <Pressable style={styles.overlay} onPress={() => setPickerOpen(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: theme.colors.surface.card }]}
            onPress={(e) => e.stopPropagation()}
          >
            <SafeAreaView edges={["bottom"]}>
              <View
                style={[
                  styles.sheetHeader,
                  { borderBottomColor: theme.colors.border.subtle },
                ]}
              >
                <TouchableOpacity onPress={() => setPickerOpen(false)}>
                  <AppText variant="body" color="secondary">
                    Cancel
                  </AppText>
                </TouchableOpacity>
                <AppText variant="bodySemibold">Choose time zone</AppText>
                <View style={styles.headerSpacer} />
              </View>
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search cities or regions"
                placeholderTextColor={theme.colors.text.muted}
                style={[
                  styles.search,
                  {
                    backgroundColor: theme.colors.surface.input,
                    borderColor: theme.colors.border.subtle,
                    color: theme.colors.text.primary,
                  },
                ]}
              />
              <ScrollView style={styles.list} keyboardShouldPersistTaps="handled">
                {filteredZones.map((tz) => {
                  const selected = customTz === tz;
                  return (
                    <TouchableOpacity
                      key={tz}
                      style={[
                        styles.zoneRow,
                        {
                          borderBottomColor: theme.colors.border.subtle,
                          backgroundColor: selected
                            ? theme.colors.surface.input
                            : "transparent",
                        },
                      ]}
                      onPress={() => {
                        onCustomTzChange(tz);
                        setPickerOpen(false);
                      }}
                    >
                      <AppText variant="bodySemibold">{tz}</AppText>
                      <AppText variant="caption" color="muted">
                        {formatTimezoneShort(tz)}
                      </AppText>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </SafeAreaView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 8, marginBottom: 4 },
  heading: { marginBottom: 6, letterSpacing: 1 },
  row: { flexDirection: "row", gap: 8, paddingVertical: 2 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  active: { marginTop: 6 },
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: Platform.OS === "web" ? "80%" : "75%",
  },
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerSpacer: { width: 48 },
  search: {
    margin: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
  },
  list: { maxHeight: 360 },
  zoneRow: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
