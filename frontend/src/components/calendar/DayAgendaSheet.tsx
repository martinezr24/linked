import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { router } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText } from "@/components/ui/AppText";
import { useCoupleNames } from "@/hooks/useCoupleNames";
import { useTheme } from "@/theme/useTheme";
import {
  eventStartIso,
  formatDateLabelInTimezone,
  formatEventTime,
} from "@/utils/dates";
import { eventColorFor, ownerFilterLabel } from "@/utils/eventColors";
import type { SharedEvent } from "@/types";

type Props = {
  visible: boolean;
  day: string;
  events: SharedEvent[];
  timeZone: string;
  timezoneLabel: string;
  onClose: () => void;
  onAdd: () => void;
  onEdit: (event: SharedEvent) => void;
  onDelete: (id: string) => void;
};

export function DayAgendaSheet({
  visible,
  day,
  events,
  timeZone,
  timezoneLabel,
  onClose,
  onAdd,
  onEdit,
  onDelete,
}: Props) {
  const theme = useTheme();
  const { mineName, partnerName } = useCoupleNames();
  const label = formatDateLabelInTimezone(day, timeZone);

  const sorted = [...events].sort(
    (a, b) =>
      new Date(eventStartIso(a)).getTime() -
      new Date(eventStartIso(b)).getTime(),
  );

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
                  Close
                </AppText>
              </TouchableOpacity>
              <AppText variant="bodySemibold">Agenda</AppText>
              <View style={styles.headerSpacer} />
            </View>

            <ScrollView contentContainerStyle={styles.body}>
              <AppText variant="h2" style={styles.dayTitle}>
                {label}
              </AppText>
              <AppText variant="caption" color="muted" style={styles.tzHint}>
                Times in {timezoneLabel}
              </AppText>

              {sorted.length === 0 ? (
                <AppText variant="body" color="muted" style={styles.empty}>
                  Nothing planned this day.
                </AppText>
              ) : (
                sorted.map((item) => {
                  const ownerColors = eventColorFor(item.ownerType, theme);
                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.item,
                        { borderTopColor: theme.colors.border.subtle },
                      ]}
                    >
                      <TouchableOpacity
                        style={styles.itemBody}
                        onPress={() => onEdit(item)}
                      >
                        <View style={styles.itemTitleRow}>
                          <View
                            style={[
                              styles.ownerDot,
                              { backgroundColor: ownerColors.bg },
                            ]}
                          />
                          <AppText variant="bodySemibold" style={styles.itemTitle}>
                            {item.title}
                          </AppText>
                        </View>
                        <AppText
                          variant="body"
                          color="secondary"
                          style={styles.itemTime}
                        >
                          {formatEventTime(item, timeZone)}
                        </AppText>
                        <AppText variant="caption" color="muted">
                          {ownerFilterLabel(
                            item.ownerType ?? "shared",
                            mineName,
                            partnerName,
                          )}
                        </AppText>
                        {item.description ? (
                          <AppText
                            variant="body"
                            color="muted"
                            numberOfLines={2}
                            style={styles.itemNotes}
                          >
                            {item.description}
                          </AppText>
                        ) : null}
                      </TouchableOpacity>
                      <View style={styles.actions}>
                        <TouchableOpacity
                          onPress={() => {
                            onClose();
                            router.push({
                              pathname: "/visit/[eventId]",
                              params: {
                                eventId: item.id,
                                title: item.title,
                                eventAt: eventStartIso(item),
                              },
                            });
                          }}
                        >
                          <AppText variant="caption" color="accent">
                            Plan visit
                          </AppText>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => onDelete(item.id)}>
                          <AppText color="accent">✕</AppText>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              )}

              <TouchableOpacity onPress={onAdd} style={styles.addLink}>
                <AppText variant="bodySemibold" color="accent">
                  + Add event
                </AppText>
              </TouchableOpacity>
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
    maxHeight: Platform.OS === "web" ? "70%" : "65%",
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
  dayTitle: { marginBottom: 4 },
  tzHint: { marginBottom: 12 },
  empty: { marginBottom: 8 },
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingTop: 12,
    marginTop: 4,
    borderTopWidth: 1,
  },
  itemBody: { flex: 1 },
  itemTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  ownerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  itemTitle: { flex: 1 },
  itemTime: { marginTop: 4 },
  itemNotes: { marginTop: 4 },
  actions: { alignItems: "flex-end", gap: 12, marginLeft: 12 },
  addLink: { marginTop: 16 },
});
