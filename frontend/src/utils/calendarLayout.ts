import type { SharedEvent } from "@/types";
import {
  eventCalendarEndDay,
  eventCalendarStartDay,
  eventStartIso,
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
  /** Visible pill lanes (capped at MAX_VISIBLE_LANES). */
  laneCount: number;
  /** Hidden event count per day date string; omit or 0 when none. */
  overflowByDay: Record<string, number>;
};

export const MAX_VISIBLE_LANES = 2;

const WEEKDAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];

export function weekdayLabels(): string[] {
  return WEEKDAY_LABELS;
}

export function isGoogleEvent(ev: SharedEvent): boolean {
  return ev.ownerLabel === "google" || ev.id.startsWith("gcal_");
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

function eventTouchesDay(
  event: SharedEvent,
  day: string,
  timeZone?: string,
): boolean {
  const startDay = eventCalendarStartDay(event, timeZone);
  const endDay = eventCalendarEndDay(event, timeZone);
  return day >= startDay && day <= endDay;
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

  // Orbit first so shared dates keep low lanes; then column, longer span, start time.
  return raw.sort((a, b) => {
    const aGoogle = isGoogleEvent(a.event);
    const bGoogle = isGoogleEvent(b.event);
    if (aGoogle !== bGoogle) return aGoogle ? 1 : -1;
    if (a.startCol !== b.startCol) return a.startCol - b.startCol;
    const aSpan = a.endCol - a.startCol;
    const bSpan = b.endCol - b.startCol;
    if (aSpan !== bSpan) return bSpan - aSpan;
    return eventStartIso(a.event).localeCompare(eventStartIso(b.event));
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

function computeOverflowByDay(
  weekDays: CalendarDay[],
  events: SharedEvent[],
  visible: PillSegment[],
  timeZone?: string,
): Record<string, number> {
  const overflowByDay: Record<string, number> = {};

  for (let col = 0; col < weekDays.length; col++) {
    const day = weekDays[col];
    const total = events.filter((ev) =>
      eventTouchesDay(ev, day.date, timeZone),
    ).length;
    if (total === 0) continue;

    const shown = visible.filter(
      (seg) => col >= seg.startCol && col <= seg.endCol,
    ).length;
    const hidden = total - shown;
    if (hidden > 0) overflowByDay[day.date] = hidden;
  }

  return overflowByDay;
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
    const weekStart = weekDays[0].date;
    const weekEnd = weekDays[6].date;
    const weekEvents = events.filter((ev) => {
      const startDay = eventCalendarStartDay(ev, timeZone);
      const endDay = eventCalendarEndDay(ev, timeZone);
      return !(endDay < weekStart || startDay > weekEnd);
    });

    const raw = segmentsForWeek(weekDays, weekIndex, weekEvents, timeZone);
    const allLanes = assignLanes(raw);
    const segments = allLanes.filter((s) => s.lane < MAX_VISIBLE_LANES);
    const laneCount = segments.reduce(
      (max, s) => Math.max(max, s.lane + 1),
      0,
    );
    const overflowByDay = computeOverflowByDay(
      weekDays,
      weekEvents,
      segments,
      timeZone,
    );
    weeks.push({ days: weekDays, segments, laneCount, overflowByDay });
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

/** Row height for visible pill lanes, plus one slot when any day has a +N chip. */
export function weekRowHeight(laneCount: number, hasOverflow = false): number {
  const lanes = laneCount + (hasOverflow ? 1 : 0);
  if (lanes === 0) return WEEK_BASE_HEIGHT + DAY_NUMBER_HEIGHT;
  return (
    DAY_NUMBER_HEIGHT +
    lanes * PILL_HEIGHT +
    Math.max(0, lanes - 1) * PILL_GAP +
    6
  );
}
