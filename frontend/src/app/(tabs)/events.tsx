import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { SafeAreaView } from "react-native-safe-area-context";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { CalendarTimezonePicker } from "@/components/calendar/CalendarTimezonePicker";
import { DayAgendaSheet } from "@/components/calendar/DayAgendaSheet";
import { EventFormSheet } from "@/components/calendar/EventFormSheet";
import { OwnerFilterChips } from "@/components/calendar/OwnerFilterChips";
import { PillMonthGrid } from "@/components/calendar/PillMonthGrid";
import { AppText } from "@/components/ui/AppText";
import { ScreenBackground } from "@/components/ui/ScreenBackground";
import { queryKeys } from "@/api/queryKeys";
import {
  createEvent,
  deleteEvent,
  fetchEvents,
  updateEvent,
} from "@/api/fetchers";
import { useCalendarTimezone } from "@/hooks/useCalendarTimezone";
import { useRelationship } from "@/context/RelationshipContext";
import { eventsForDay, todayInTimezone, monthRange } from "@/utils/dates";
import { showMutationError } from "@/utils/errors";
import { generateId } from "@/utils/id";
import { useTheme } from "@/theme/useTheme";
import type { EventOwnerType, SharedEvent } from "@/types";

export default function EventsScreen() {
  const theme = useTheme();
  const { deviceId } = useRelationship();
  const queryClient = useQueryClient();
  const [visibleMonth, setVisibleMonth] = useState(new Date());
  const [agendaDay, setAgendaDay] = useState<string | null>(null);
  const [ownerFilter, setOwnerFilter] = useState<EventOwnerType | "all">("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [createDate, setCreateDate] = useState<string | undefined>();
  const [editing, setEditing] = useState<SharedEvent | null>(null);

  const calendarTz = useCalendarTimezone();
  const { activeTimezone, activeLabel, ready: tzReady } = calendarTz;
  const tabBarHeight = useBottomTabBarHeight();

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
      setCreateDate(undefined);
      invalidateEvents();
    },
    onError: () => showMutationError("Could not save event."),
  });

  const removeEvent = useMutation({
    mutationFn: (id: string) => deleteEvent(deviceId!, id),
    onSuccess: () => {
      setSheetOpen(false);
      setEditing(null);
      setAgendaDay(null);
      invalidateEvents();
    },
    onError: () => showMutationError("Could not delete event."),
  });

  const openCreate = (day?: string) => {
    setEditing(null);
    setCreateDate(day ?? agendaDay ?? todayInTimezone(activeTimezone));
    setSheetOpen(true);
  };

  const openEdit = (event: SharedEvent) => {
    setAgendaDay(null);
    setEditing(event);
    setCreateDate(undefined);
    setSheetOpen(true);
  };

  const agendaEvents = useMemo(
    () =>
      agendaDay ? eventsForDay(events, agendaDay, activeTimezone) : [],
    [events, agendaDay, activeTimezone],
  );

  if (isLoading || !tzReady) {
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
        <View style={styles.header}>
          <AppText variant="h1" style={styles.title}>
            Calendar
          </AppText>
          <AppText variant="body" color="secondary">
            Shared dates you both should know about.
          </AppText>
          <OwnerFilterChips value={ownerFilter} onChange={setOwnerFilter} />
          <CalendarTimezonePicker
            mode={calendarTz.mode}
            customTz={calendarTz.customTz}
            partnerTz={calendarTz.partnerTz}
            activeLabel={calendarTz.activeLabel}
            partnerUnavailable={calendarTz.partnerUnavailable}
            onModeChange={calendarTz.setMode}
            onCustomTzChange={calendarTz.setCustomTz}
          />
        </View>

        <PillMonthGrid
          visibleMonth={visibleMonth}
          events={events}
          ownerFilter={ownerFilter}
          timeZone={activeTimezone}
          selectedDay={agendaDay}
          onMonthChange={setVisibleMonth}
          onDayPress={setAgendaDay}
          onEventPress={openEdit}
        />

        <TouchableOpacity
          style={[
            styles.fab,
            {
              backgroundColor: theme.colors.accent.primary,
              bottom: tabBarHeight + 12,
            },
          ]}
          onPress={() => openCreate()}
          activeOpacity={0.85}
          accessibilityLabel="Add event"
          accessibilityRole="button"
        >
          <Text style={styles.fabIcon}>+</Text>
        </TouchableOpacity>

        <DayAgendaSheet
          visible={agendaDay !== null}
          day={agendaDay ?? todayInTimezone(activeTimezone)}
          events={agendaEvents}
          timeZone={activeTimezone}
          timezoneLabel={activeLabel}
          onClose={() => setAgendaDay(null)}
          onAdd={() => {
            const day = agendaDay ?? todayInTimezone(activeTimezone);
            setAgendaDay(null);
            openCreate(day);
          }}
          onEdit={openEdit}
          onDelete={(id) => removeEvent.mutate(id)}
        />

        <EventFormSheet
          visible={sheetOpen}
          initial={editing}
          defaultDate={createDate}
          onClose={() => {
            setSheetOpen(false);
            setEditing(null);
            setCreateDate(undefined);
          }}
          onSave={(ev) => saveEvent.mutate(ev)}
          onDelete={(id) => removeEvent.mutate(id)}
          saving={saveEvent.isPending}
          deleting={removeEvent.isPending}
        />
      </SafeAreaView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 8,
  },
  title: { marginBottom: 4, fontFamily: "DMSans_700Bold" },
  fab: {
    position: "absolute",
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 10,
  },
  fabIcon: {
    color: "#FFFFFF",
    fontSize: 32,
    lineHeight: 34,
    fontFamily: "DMSans_400Regular",
    marginTop: -2,
  },
});
