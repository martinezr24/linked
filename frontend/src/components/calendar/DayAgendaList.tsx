import { StyleSheet, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";

import { AppText } from "@/components/ui/AppText";
import { ArtifactCard } from "@/components/ui/ArtifactCard";
import { useTheme } from "@/theme/useTheme";
import { dateToIso, eventStartIso, formatLocalDateLabel, formatMMDDYYYY } from "@/utils/dates";
import type { SharedEvent } from "@/types";

type Props = {
  day: string;
  events: SharedEvent[];
  onAdd: () => void;
  onEdit: (event: SharedEvent) => void;
  onDelete: (id: string) => void;
};

export function DayAgendaList({ day, events, onAdd, onEdit, onDelete }: Props) {
  const theme = useTheme();
  const [y, m, d] = day.split("-").map(Number);
  const label = formatLocalDateLabel(dateToIso(new Date(y, m - 1, d)));

  return (
    <ArtifactCard category="Agenda" title={label}>
      {events.length === 0 ? (
        <AppText variant="body" color="muted" style={styles.empty}>
          Nothing planned this day.
        </AppText>
      ) : (
        events.map((item) => (
          <View
            key={item.id}
            style={[
              styles.item,
              { borderTopColor: theme.colors.border.subtle },
            ]}
          >
            <TouchableOpacity style={styles.itemBody} onPress={() => onEdit(item)}>
              <AppText variant="bodySemibold">{item.title}</AppText>
              <AppText variant="body" color="secondary" style={styles.itemDate}>
                {formatMMDDYYYY(eventStartIso(item))}
                {item.endAt && item.endAt !== item.startAt
                  ? ` – ${formatMMDDYYYY(item.endAt)}`
                  : ""}
              </AppText>
              {item.ownerLabel ? (
                <AppText variant="caption" color="muted">
                  {item.ownerLabel}
                </AppText>
              ) : null}
              {item.description ? (
                <AppText variant="body" color="muted" numberOfLines={2}>
                  {item.description}
                </AppText>
              ) : null}
            </TouchableOpacity>
            <View style={styles.actions}>
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: "/visit/[eventId]",
                    params: {
                      eventId: item.id,
                      title: item.title,
                      eventAt: eventStartIso(item),
                    },
                  })
                }
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
        ))
      )}
      <TouchableOpacity onPress={onAdd} style={styles.addLink}>
        <AppText variant="bodySemibold" color="accent">
          + Add event
        </AppText>
      </TouchableOpacity>
    </ArtifactCard>
  );
}

const styles = StyleSheet.create({
  empty: { marginBottom: 8 },
  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingTop: 12,
    marginTop: 4,
    borderTopWidth: 1,
  },
  itemBody: { flex: 1 },
  itemDate: { marginTop: 4 },
  actions: { alignItems: "flex-end", gap: 12, marginLeft: 12 },
  addLink: { marginTop: 16 },
});
