import { useMemo, useState } from "react";
import {
  LayoutChangeEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

import { EventPill } from "@/components/calendar/EventPill";
import { AppText } from "@/components/ui/AppText";
import { useTheme } from "@/theme/useTheme";
import {
  DAY_NUMBER_HEIGHT,
  layoutMonthPills,
  monthTitle,
  PILL_GAP,
  PILL_HEIGHT,
  shiftMonth,
  weekdayLabels,
  weekRowHeight,
} from "@/utils/calendarLayout";
import { todayInTimezone } from "@/utils/dates";
import type { EventOwnerType, SharedEvent } from "@/types";
import { matchesOwnerFilter } from "@/utils/eventColors";

type Props = {
  visibleMonth: Date;
  events: SharedEvent[];
  ownerFilter: EventOwnerType | "all";
  timeZone: string;
  selectedDay?: string | null;
  onMonthChange: (month: Date) => void;
  onDayPress: (day: string) => void;
  onEventPress: (event: SharedEvent) => void;
};

export function PillMonthGrid({
  visibleMonth,
  events,
  ownerFilter,
  timeZone,
  selectedDay,
  onMonthChange,
  onDayPress,
  onEventPress,
}: Props) {
  const theme = useTheme();
  const [cellWidth, setCellWidth] = useState(0);
  const today = todayInTimezone(timeZone);

  const filteredEvents = useMemo(
    () =>
      events.filter((ev) =>
        matchesOwnerFilter(ev.ownerType, ownerFilter),
      ),
    [events, ownerFilter],
  );

  const { weeks } = useMemo(
    () => layoutMonthPills(visibleMonth, filteredEvents, timeZone),
    [visibleMonth, filteredEvents, timeZone],
  );

  const onGridLayout = (e: LayoutChangeEvent) => {
    const width = e.nativeEvent.layout.width;
    if (width > 0) {
      setCellWidth(width / 7);
    }
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.monthNavBtn}
          onPress={() => onMonthChange(shiftMonth(visibleMonth, -1))}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
          accessibilityLabel="Previous month"
        >
          <AppText variant="h2" color="accent" style={styles.monthNavIcon}>
            ‹
          </AppText>
        </TouchableOpacity>
        <AppText variant="h2" style={styles.monthTitle}>
          {monthTitle(visibleMonth)}
        </AppText>
        <TouchableOpacity
          style={styles.monthNavBtn}
          onPress={() => onMonthChange(shiftMonth(visibleMonth, 1))}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
          accessibilityLabel="Next month"
        >
          <AppText variant="h2" color="accent" style={styles.monthNavIcon}>
            ›
          </AppText>
        </TouchableOpacity>
      </View>

      <View style={styles.weekdayRow}>
        {weekdayLabels().map((label, i) => (
          <View key={`${label}-${i}`} style={styles.weekdayCell}>
            <AppText variant="caption" color="muted">
              {label}
            </AppText>
          </View>
        ))}
      </View>

      <ScrollView
        style={styles.gridScroll}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <View onLayout={onGridLayout}>
          {weeks.map((week) => {
            const rowHeight = weekRowHeight(week.laneCount);

            return (
              <View
                key={week.days[0].date}
                style={[
                  styles.weekRow,
                  {
                    height: rowHeight,
                    borderColor: theme.colors.border.subtle,
                  },
                ]}
              >
                {week.days.map((day) => {
                  const isToday = day.date === today;
                  const isSelected = day.date === selectedDay;

                  return (
                    <Pressable
                      key={day.date}
                      style={[
                        styles.dayCell,
                        {
                          backgroundColor: theme.colors.surface.card,
                          opacity: day.inMonth ? 0.72 : 0.35,
                          borderColor: theme.colors.border.subtle,
                        },
                      ]}
                      onPress={() => onDayPress(day.date)}
                    >
                      <View
                        style={[
                          styles.dayNumberWrap,
                          isToday && {
                            borderWidth: 1,
                            borderColor: theme.colors.accent.primary,
                            borderRadius: 999,
                          },
                          isSelected && {
                            backgroundColor: theme.colors.accent.primary,
                            borderRadius: 999,
                          },
                        ]}
                      >
                        <AppText
                          variant="bodySemibold"
                          style={{
                            color: isSelected
                              ? theme.colors.text.onAccent
                              : isToday
                                ? theme.colors.accent.primary
                                : day.inMonth
                                  ? theme.colors.text.primary
                                  : theme.colors.text.muted,
                            fontSize: 13,
                          }}
                        >
                          {day.dayOfMonth}
                        </AppText>
                      </View>
                    </Pressable>
                  );
                })}

                {cellWidth > 0 &&
                  week.segments.map((seg) => {
                    const span = seg.endCol - seg.startCol + 1;
                    const pillWidth = span * cellWidth - 4;
                    const left = seg.startCol * cellWidth + 2;
                    const top =
                      DAY_NUMBER_HEIGHT +
                      seg.lane * (PILL_HEIGHT + PILL_GAP) +
                      2;

                    return (
                      <EventPill
                        key={`${seg.event.id}-${seg.weekIndex}-${seg.startCol}`}
                        event={seg.event}
                        width={pillWidth}
                        left={left}
                        top={top}
                        isSegmentStart={seg.isSegmentStart}
                        isSegmentEnd={seg.isSegmentEnd}
                        onPress={onEventPress}
                      />
                    );
                  })}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 0,
  },
  monthNavBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  monthNavIcon: {
    fontSize: 36,
    lineHeight: 40,
  },
  monthTitle: {
    flex: 1,
    textAlign: "center",
  },
  weekdayRow: {
    flexDirection: "row",
    marginBottom: 6,
  },
  weekdayCell: {
    flex: 1,
    alignItems: "center",
  },
  gridScroll: {
    flex: 1,
  },
  weekRow: {
    flexDirection: "row",
    position: "relative",
    borderBottomWidth: StyleSheet.hairlineWidth,
    overflow: "visible",
  },
  dayCell: {
    flex: 1,
    borderRightWidth: StyleSheet.hairlineWidth,
    paddingTop: 4,
    paddingHorizontal: 2,
    overflow: "visible",
  },
  dayNumberWrap: {
    alignSelf: "flex-start",
    minWidth: 24,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
});
