import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { DateData } from "react-native-calendars";

import { DayAgendaList } from "@/components/calendar/DayAgendaList";
import { EventFormSheet } from "@/components/calendar/EventFormSheet";
import { SharedCalendar } from "@/components/calendar/SharedCalendar";
import { AppText } from "@/components/ui/AppText";
import { ScreenBackground } from "@/components/ui/ScreenBackground";
import { queryKeys } from "@/api/queryKeys";
import {
  createEvent,
  deleteEvent,
  fetchEvents,
  updateEvent,
} from "@/api/fetchers";
import { useRelationship } from "@/context/RelationshipContext";
import {
  eventsForDay,
  localDateString,
  monthRange,
} from "@/utils/dates";
import { showMutationError } from "@/utils/errors";
import { generateId } from "@/utils/id";
import { useTheme } from "@/theme/useTheme";
import type { SharedEvent } from "@/types";

export default function EventsScreen() {
  const theme = useTheme();
  const { deviceId } = useRelationship();
  const queryClient = useQueryClient();
  const [visibleMonth, setVisibleMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(localDateString());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<SharedEvent | null>(null);

  const range = useMemo(() => monthRange(visibleMonth), [visibleMonth]);

  const { data: events = [], isLoading } = useQuery({
    queryKey: queryKeys.eventsRange(range.start, range.end),
    queryFn: () => fetchEvents(deviceId!, range),
    enabled: Boolean(deviceId),
  });

  const invalidateEvents = () =>
    void queryClient.invalidateQueries({ queryKey: ["events"] });

  const saveEvent = useMutation({
    mutationFn: async (ev: SharedEvent) => {
      if (ev.id) {
        return updateEvent(deviceId!, ev);
      }
      return createEvent(deviceId!, { ...ev, id: generateId() });
    },
    onSuccess: () => {
      setSheetOpen(false);
      setEditing(null);
      invalidateEvents();
    },
    onError: () => showMutationError("Could not save event."),
  });

  const removeEvent = useMutation({
    mutationFn: (id: string) => deleteEvent(deviceId!, id),
    onSuccess: invalidateEvents,
    onError: () => showMutationError("Could not delete event."),
  });

  const dayEvents = eventsForDay(events, selectedDate);

  const openCreate = () => {
    setEditing(null);
    setSheetOpen(true);
  };

  const openEdit = (event: SharedEvent) => {
    setEditing(event);
    setSheetOpen(true);
  };

  if (isLoading) {
    return (
      <ScreenBackground>
        <SafeAreaView style={[styles.safe, styles.centered]}>
          <ActivityIndicator size="large" color={theme.colors.accent.primary} />
        </SafeAreaView>
      </ScreenBackground>
    );
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <AppText variant="h1" style={styles.title}>
            Calendar
          </AppText>
          <AppText variant="body" color="secondary" style={styles.subtitle}>
            Shared dates you both should know about.
          </AppText>

          <SharedCalendar
            selectedDate={selectedDate}
            visibleMonth={visibleMonth}
            events={events}
            onSelectDate={(day: DateData) => setSelectedDate(day.dateString)}
            onMonthChange={(month: DateData) => {
              setVisibleMonth(new Date(month.year, month.month - 1, 1));
            }}
          />

          <DayAgendaList
            day={selectedDate}
            events={dayEvents}
            onAdd={openCreate}
            onEdit={openEdit}
            onDelete={(id) => removeEvent.mutate(id)}
          />
        </ScrollView>

        <EventFormSheet
          visible={sheetOpen}
          initial={editing}
          defaultDate={selectedDate}
          onClose={() => {
            setSheetOpen(false);
            setEditing(null);
          }}
          onSave={(ev) => saveEvent.mutate(ev)}
          saving={saveEvent.isPending}
        />
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  scroll: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 100 },
  title: { marginBottom: 4, fontFamily: "DMSans_700Bold" },
  subtitle: { marginBottom: 16 },
});
