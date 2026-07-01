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

const MS_PER_DAY = 1000 * 60 * 60 * 24;

function midnight(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function daysBetween(from: Date, to: Date): number {
  return Math.round(
    (midnight(to).getTime() - midnight(from).getTime()) / MS_PER_DAY,
  );
}

export type NextAnniversary = {
  /** Which anniversary it is, e.g. 4 for the "4 year anniversary". */
  yearNumber: number;
  months: number;
  days: number;
  date: Date;
};

/** The next yearly anniversary with a months + days countdown. */
export function nextAnniversary(
  anniversary: string,
  now: Date = new Date(),
): NextAnniversary | null {
  const start = new Date(`${anniversary}T00:00:00`);
  if (Number.isNaN(start.getTime())) return null;

  const today = midnight(now);
  let next = new Date(today.getFullYear(), start.getMonth(), start.getDate());
  if (next < today) {
    next = new Date(today.getFullYear() + 1, start.getMonth(), start.getDate());
  }
  const yearNumber = next.getFullYear() - start.getFullYear();

  let months =
    (next.getFullYear() - today.getFullYear()) * 12 +
    (next.getMonth() - today.getMonth());
  let days = next.getDate() - today.getDate();
  if (days < 0) {
    months -= 1;
    const prevMonthDays = new Date(
      next.getFullYear(),
      next.getMonth(),
      0,
    ).getDate();
    days += prevMonthDays;
  }
  return { yearNumber, months, days, date: next };
}

/** Total whole days since the anniversary (never negative). */
export function totalDaysTogether(
  anniversary: string,
  now: Date = new Date(),
): number | null {
  const start = new Date(`${anniversary}T00:00:00`);
  if (Number.isNaN(start.getTime())) return null;
  return Math.max(0, daysBetween(start, now));
}

export type Milestone = {
  key: string;
  label: string;
  date: Date;
  daysUntil: number;
};

/**
 * Upcoming relationship milestones — a blend of yearly anniversaries and
 * round hundred-day marks — sorted soonest-first.
 */
export function upcomingMilestones(
  anniversary: string,
  now: Date = new Date(),
  count = 3,
): Milestone[] {
  const start = new Date(`${anniversary}T00:00:00`);
  if (Number.isNaN(start.getTime())) return [];

  const today = midnight(now);
  const startMid = midnight(start);
  const daysSoFar = Math.max(0, daysBetween(startMid, today));
  const candidates: Milestone[] = [];

  // Upcoming yearly anniversaries.
  let year = today.getFullYear();
  let annivFound = 0;
  while (annivFound <= count) {
    const date = new Date(year, start.getMonth(), start.getDate());
    if (date > today) {
      const n = year - start.getFullYear();
      candidates.push({
        key: `anniv-${n}`,
        label: `${n} year anniversary`,
        date,
        daysUntil: daysBetween(today, date),
      });
      annivFound += 1;
    }
    year += 1;
  }

  // Upcoming round hundred-day marks.
  const nextHundred = (Math.floor(daysSoFar / 100) + 1) * 100;
  for (let d = nextHundred; d <= nextHundred + count * 100; d += 100) {
    const date = new Date(startMid);
    date.setDate(date.getDate() + d);
    candidates.push({
      key: `days-${d}`,
      label: `${d.toLocaleString()} days together`,
      date,
      daysUntil: daysBetween(today, date),
    });
  }

  return candidates
    .filter((c) => c.daysUntil >= 0)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, count);
}
