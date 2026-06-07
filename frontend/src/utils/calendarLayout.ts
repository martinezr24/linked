import type { SharedEvent } from "@/types";
import {
  eventCalendarEndDay,
  eventCalendarStartDay,
  localDateString,
} from "@/utils/dates";

export type CalendarDay = {
  date: string;
  dayOfMonth: number;
  inMonth: boolean;
};

export type PillSegment = {
  event: SharedEvent;
  weekIndex: number;
  startCol: number;
  endCol: number;
  lane: number;
  isSegmentStart: boolean;
  isSegmentEnd: boolean;
};

export type WeekLayout = {
  days: CalendarDay[];
  segments: PillSegment[];
  laneCount: number;
};

const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

export function weekdayLabels(): string[] {
  return WEEKDAY_LABELS;
}

export function buildMonthGrid(visibleMonth: Date): CalendarDay[] {
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstOfMonth = new Date(year, month, 1);
  const lastOfMonth = new Date(year, month + 1, 0);

  // Monday-start grid (Mon=0 .. Sun=6)
  const jsDay = firstOfMonth.getDay();
  const mondayOffset = jsDay === 0 ? 6 : jsDay - 1;
  const gridStart = new Date(year, month, 1 - mondayOffset);

  const days: CalendarDay[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(
      gridStart.getFullYear(),
      gridStart.getMonth(),
      gridStart.getDate() + i,
    );
    days.push({
      date: localDateString(d),
      dayOfMonth: d.getDate(),
      inMonth: d.getMonth() === month,
    });
  }

  // Trim trailing week if entirely next month
  const lastWeek = days.slice(-7);
  if (lastWeek.every((day) => !day.inMonth)) {
    days.splice(-7);
  }

  void lastOfMonth;
  return days;
}

function dayIndexInGrid(days: CalendarDay[], date: string): number {
  return days.findIndex((d) => d.date === date);
}

function clampDayToGrid(
  days: CalendarDay[],
  date: string,
): string {
  if (days.length === 0) return date;
  const first = days[0].date;
  const last = days[days.length - 1].date;
  if (date < first) return first;
  if (date > last) return last;
  return date;
}

function segmentsForWeek(
  weekDays: CalendarDay[],
  weekIndex: number,
  events: SharedEvent[],
  timeZone?: string,
): Omit<PillSegment, "lane">[] {
  const raw: Omit<PillSegment, "lane">[] = [];

  for (const event of events) {
    const startDay = eventCalendarStartDay(event, timeZone);
    const endDay = eventCalendarEndDay(event, timeZone);
    const weekStart = weekDays[0].date;
    const weekEnd = weekDays[6].date;

    if (endDay < weekStart || startDay > weekEnd) continue;

    const segStart = clampDayToGrid(weekDays, startDay);
    const segEnd = clampDayToGrid(weekDays, endDay);
    const startCol = dayIndexInGrid(weekDays, segStart);
    const endCol = dayIndexInGrid(weekDays, segEnd);
    if (startCol < 0 || endCol < 0) continue;

    raw.push({
      event,
      weekIndex,
      startCol,
      endCol,
      isSegmentStart: segStart === startDay,
      isSegmentEnd: segEnd === endDay,
    });
  }

  return raw.sort((a, b) => {
    if (a.startCol !== b.startCol) return a.startCol - b.startCol;
    const aSpan = a.endCol - a.startCol;
    const bSpan = b.endCol - b.startCol;
    return bSpan - aSpan;
  });
}

function assignLanes(segments: Omit<PillSegment, "lane">[]): PillSegment[] {
  const lanes: PillSegment[] = [];
  const laneEnds: number[] = [];

  for (const seg of segments) {
    let lane = laneEnds.findIndex((endCol) => endCol < seg.startCol);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(seg.endCol);
    } else {
      laneEnds[lane] = seg.endCol;
    }
    lanes.push({ ...seg, lane });
  }

  return lanes;
}

export function layoutMonthPills(
  visibleMonth: Date,
  events: SharedEvent[],
  timeZone?: string,
): { days: CalendarDay[]; weeks: WeekLayout[] } {
  const days = buildMonthGrid(visibleMonth);
  const weeks: WeekLayout[] = [];

  for (let w = 0; w < days.length; w += 7) {
    const weekDays = days.slice(w, w + 7);
    const weekIndex = w / 7;
    const raw = segmentsForWeek(weekDays, weekIndex, events, timeZone);
    const segments = assignLanes(raw);
    const laneCount = segments.reduce(
      (max, s) => Math.max(max, s.lane + 1),
      0,
    );
    weeks.push({ days: weekDays, segments, laneCount });
  }

  return { days, weeks };
}

export function monthTitle(date: Date): string {
  return date.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}

export function shiftMonth(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

export const PILL_HEIGHT = 18;
export const PILL_GAP = 3;
export const DAY_NUMBER_HEIGHT = 22;
export const WEEK_BASE_HEIGHT = 28;

export function weekRowHeight(laneCount: number): number {
  if (laneCount === 0) return WEEK_BASE_HEIGHT + DAY_NUMBER_HEIGHT;
  return (
    DAY_NUMBER_HEIGHT +
    laneCount * PILL_HEIGHT +
    Math.max(0, laneCount - 1) * PILL_GAP +
    6
  );
}
