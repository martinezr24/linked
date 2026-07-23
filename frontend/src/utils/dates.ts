/** Local calendar date at noon to avoid timezone day shifts. */
export function dateToIso(date: Date): string {
  const d = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
    12,
    0,
    0,
    0,
  );
  return d.toISOString();
}

/** Preserve full local time — use for timed events. */
export function dateTimeToIso(date: Date): string {
  return date.toISOString();
}

/** YYYY-MM-DD in the device local calendar (for daily check-in boundaries). */
export function localDateString(date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/** Calendar date from a UTC-encoded all-day timestamp (YYYY-MM-DD at UTC noon). */
export function utcCalendarDateString(iso: string): string {
  const d = new Date(iso);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export function allDayIsoFromLocalDate(date: Date): string {
  return `${localDateString(date)}T12:00:00.000Z`;
}

/** All-day: encode local calendar dates as UTC noon on each day (timezone-safe). */
export function allDayRangeIso(start: Date, end: Date) {
  return {
    startAt: allDayIsoFromLocalDate(start),
    endAt: allDayIsoFromLocalDate(end),
  };
}

export function isoToAllDayDate(iso: string): Date {
  const [y, m, d] = utcCalendarDateString(iso).split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function eventCalendarStartDay(
  ev: {
    allDay?: boolean;
    startAt?: string;
    eventAt: string;
  },
  timeZone?: string,
): string {
  const iso = eventStartIso(ev);
  if (ev.allDay) return utcCalendarDateString(iso);
  if (timeZone) return calendarDateInTimezone(iso, timeZone);
  return localDateString(new Date(iso));
}

export function eventCalendarEndDay(
  ev: {
    allDay?: boolean;
    endAt?: string;
    startAt?: string;
    eventAt: string;
  },
  timeZone?: string,
): string {
  const iso = eventEndIso(ev);
  if (ev.allDay) return utcCalendarDateString(iso);
  if (timeZone) return calendarDateInTimezone(iso, timeZone);
  return localDateString(new Date(iso));
}

/** Format as MM-DD-YYYY for display. */
export function formatMMDDYYYY(iso: string): string {
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${mm}-${dd}-${yyyy}`;
}

export function isoToDate(iso: string): Date {
  const d = new Date(iso);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Strip time — use when editing all-day event dates. */
export function toLocalCalendarDate(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function isEndBeforeStart(
  start: Date,
  end: Date,
  allDay: boolean,
): boolean {
  if (allDay) {
    return localDateString(start) > localDateString(end);
  }
  return end.getTime() < start.getTime();
}

/** e.g. "Mon, Jun 1, 2026" in device local timezone */
export function formatLocalDateLabel(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function getDeviceTimezoneLabel(): string {
  return getDeviceIANATimezone();
}

export function getDeviceIANATimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC";
  } catch {
    return "UTC";
  }
}

/** YYYY-MM-DD for an instant in a specific IANA timezone. */
export function calendarDateInTimezone(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

export function todayInTimezone(timeZone: string): string {
  return calendarDateInTimezone(new Date().toISOString(), timeZone);
}

export function formatTimezoneShort(timeZone: string): string {
  try {
    const parts = new Intl.DateTimeFormat(undefined, {
      timeZone,
      timeZoneName: "shortOffset",
    }).formatToParts(new Date());
    const offset = parts.find((p) => p.type === "timeZoneName")?.value;
    const city = timeZone.split("/").pop()?.replace(/_/g, " ") ?? timeZone;
    return offset ? `${city} (${offset})` : city;
  } catch {
    return timeZone;
  }
}

/** Current hour (0–23) in the given IANA time zone, or null if unavailable. */
export function getHourInTimeZone(timeZone?: string | null): number | null {
  if (!timeZone) return null;
  try {
    const s = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hour: "numeric",
      hour12: false,
    }).format(new Date());
    const h = parseInt(s, 10);
    if (Number.isNaN(h)) return null;
    return h === 24 ? 0 : h;
  } catch {
    return null;
  }
}

export function formatDateLabelInTimezone(
  day: string,
  timeZone: string,
): string {
  const [y, m, d] = day.split("-").map(Number);
  const utcNoon = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return utcNoon.toLocaleDateString(undefined, {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function monthRange(date: Date): { start: string; end: string } {
  const start = new Date(date.getFullYear(), date.getMonth(), 1);
  const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);
  return { start: localDateString(start), end: localDateString(end) };
}

export function eventStartIso(ev: { startAt?: string; eventAt: string }): string {
  return ev.startAt || ev.eventAt;
}

export function eventEndIso(ev: {
  endAt?: string;
  startAt?: string;
  eventAt: string;
}): string {
  return ev.endAt || ev.startAt || ev.eventAt;
}

export function eventOnDay(
  ev: { allDay?: boolean; startAt?: string; endAt?: string; eventAt: string },
  day: string,
  timeZone?: string,
): boolean {
  const startDay = eventCalendarStartDay(ev, timeZone);
  const endDay = eventCalendarEndDay(ev, timeZone);
  return day >= startDay && day <= endDay;
}

export function eventsForDay<
  T extends { allDay?: boolean; startAt?: string; endAt?: string; eventAt: string },
>(
  events: T[],
  day: string,
  timeZone?: string,
): T[] {
  return events.filter((ev) => eventOnDay(ev, day, timeZone));
}

export function formatEventTime(
  ev: {
    allDay?: boolean;
    startAt?: string;
    endAt?: string;
    eventAt: string;
  },
  timeZone?: string,
): string {
  if (ev.allDay) return "All day";
  const opts: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
    ...(timeZone ? { timeZone } : {}),
  };
  const fmt = (iso: string) => new Date(iso).toLocaleTimeString(undefined, opts);
  const start = fmt(eventStartIso(ev));
  const end = fmt(eventEndIso(ev));
  return start === end ? start : `${start} – ${end}`;
}

export function formatDateTimeLabel(date: Date): string {
  return date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function isoToDateTime(iso: string): Date {
  return new Date(iso);
}

export function toMarkedDates(
  events: {
    id: string;
    allDay?: boolean;
    startAt?: string;
    endAt?: string;
    eventAt: string;
    color?: string;
  }[],
  dotColor: string,
): Record<string, { marked?: boolean; dotColor?: string; dots?: { key: string; color: string }[] }> {
  const marked: Record<
    string,
    { marked?: boolean; dotColor?: string; dots?: { key: string; color: string }[] }
  > = {};

  for (const ev of events) {
    const startDay = eventCalendarStartDay(ev);
    const endDay = eventCalendarEndDay(ev);
    const color = ev.color || dotColor;
    const [sy, sm, sd] = startDay.split("-").map(Number);
    const [ey, em, ed] = endDay.split("-").map(Number);
    const cursor = new Date(sy, sm - 1, sd);
    const last = new Date(ey, em - 1, ed);

    while (cursor <= last) {
      const key = localDateString(cursor);
      const existing = marked[key]?.dots ?? [];
      marked[key] = {
        marked: true,
        dots: [...existing, { key: ev.id, color }],
      };
      cursor.setDate(cursor.getDate() + 1);
    }
  }

  return marked;
}
