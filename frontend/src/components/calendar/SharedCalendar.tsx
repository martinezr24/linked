import { StyleSheet, View } from "react-native";
import { Calendar, type DateData } from "react-native-calendars";

import { useTheme } from "@/theme/useTheme";
import { toMarkedDates } from "@/utils/dates";
import type { SharedEvent } from "@/types";

type Props = {
  selectedDate: string;
  visibleMonth: Date;
  events: SharedEvent[];
  onSelectDate: (day: DateData) => void;
  onMonthChange: (month: DateData) => void;
};

export function SharedCalendar({
  selectedDate,
  visibleMonth,
  events,
  onSelectDate,
  onMonthChange,
}: Props) {
  const theme = useTheme();
  const marked = {
    ...toMarkedDates(events, theme.colors.accent.primary),
    [selectedDate]: {
      ...toMarkedDates(events, theme.colors.accent.primary)[selectedDate],
      selected: true,
      selectedColor: theme.colors.accent.primary,
    },
  };

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: theme.colors.surface.card,
          borderColor: theme.colors.border.subtle,
        },
      ]}
    >
      <Calendar
        current={visibleMonth.toISOString()}
        onDayPress={onSelectDate}
        onMonthChange={onMonthChange}
        markedDates={marked}
        markingType="multi-dot"
        theme={{
          backgroundColor: "transparent",
          calendarBackground: "transparent",
          textSectionTitleColor: theme.colors.text.secondary,
          selectedDayBackgroundColor: theme.colors.accent.primary,
          selectedDayTextColor: theme.colors.text.onAccent,
          todayTextColor: theme.colors.accent.primary,
          dayTextColor: theme.colors.text.primary,
          textDisabledColor: theme.colors.text.muted,
          monthTextColor: theme.colors.text.primary,
          arrowColor: theme.colors.accent.primary,
          textDayFontFamily: "DMSans_400Regular",
          textMonthFontFamily: "DMSans_700Bold",
          textDayHeaderFontFamily: "DMSans_600SemiBold",
          textDayFontSize: 15,
          textMonthFontSize: 18,
          textDayHeaderFontSize: 11,
        }}
        enableSwipeMonths
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 16,
  },
});
