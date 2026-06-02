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
