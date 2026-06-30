export type TogetherDuration = { years: number; months: number; days: number };

/**
 * Calendar-accurate years/months/days between an anniversary date and now.
 * `anniversary` is a date-only string ("YYYY-MM-DD"). Returns null if invalid,
 * and an all-zero duration if the date is in the future.
 */
export function timeTogether(
  anniversary: string,
  now: Date = new Date(),
): TogetherDuration | null {
  const start = new Date(`${anniversary}T00:00:00`);
  if (Number.isNaN(start.getTime())) return null;
  if (start > now) return { years: 0, months: 0, days: 0 };

  let years = now.getFullYear() - start.getFullYear();
  let months = now.getMonth() - start.getMonth();
  let days = now.getDate() - start.getDate();

  if (days < 0) {
    months -= 1;
    // Days in the month before `now`.
    const prevMonthDays = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    days += prevMonthDays;
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  return { years, months, days };
}

export function formatTogether(d: TogetherDuration): string {
  const parts: string[] = [];
  if (d.years) parts.push(`${d.years} year${d.years === 1 ? "" : "s"}`);
  if (d.months) parts.push(`${d.months} month${d.months === 1 ? "" : "s"}`);
  parts.push(`${d.days} day${d.days === 1 ? "" : "s"}`);
  return parts.join(", ");
}

/** Days until the next yearly anniversary (0 means it's today). */
export function daysUntilNextAnniversary(
  anniversary: string,
  now: Date = new Date(),
): number | null {
  const start = new Date(`${anniversary}T00:00:00`);
  if (Number.isNaN(start.getTime())) return null;

  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let next = new Date(today.getFullYear(), start.getMonth(), start.getDate());
  if (next < today) {
    next = new Date(today.getFullYear() + 1, start.getMonth(), start.getDate());
  }
  const diffMs = next.getTime() - today.getTime();
  return Math.round(diffMs / (1000 * 60 * 60 * 24));
}
