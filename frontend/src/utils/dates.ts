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
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? "local time";
  } catch {
    return "local time";
  }
}

/** YYYY-MM-DD in the device local calendar (for daily check-in boundaries). */
export function localDateString(date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
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
  ev: { startAt?: string; endAt?: string; eventAt: string },
  day: string,
): boolean {
  const startDay = localDateString(new Date(eventStartIso(ev)));
  const endDay = localDateString(new Date(eventEndIso(ev)));
  return day >= startDay && day <= endDay;
}

export function eventsForDay<T extends { startAt?: string; endAt?: string; eventAt: string }>(
  events: T[],
  day: string,
): T[] {
  return events.filter((ev) => eventOnDay(ev, day));
}

export function toMarkedDates(
  events: { id: string; startAt?: string; endAt?: string; eventAt: string; color?: string }[],
  dotColor: string,
): Record<string, { marked?: boolean; dotColor?: string; dots?: { key: string; color: string }[] }> {
  const marked: Record<
    string,
    { marked?: boolean; dotColor?: string; dots?: { key: string; color: string }[] }
  > = {};

  for (const ev of events) {
    const start = new Date(eventStartIso(ev));
    const end = new Date(eventEndIso(ev));
    const color = ev.color || dotColor;
    const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());

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
