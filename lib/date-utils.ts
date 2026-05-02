/**
 * Date helpers for the calendar views. Operations are done with plain
 * JavaScript Date arithmetic in the runtime's local timezone — for
 * Vercel that's UTC, for `next dev` that's the developer's machine TZ.
 *
 * For an MVP this is acceptable; a future iteration can move to
 * timezone-aware computation using the user's stored IANA timezone.
 */

const DAYS_IN_WEEK = 7;
const WEEKS_IN_MONTH_GRID = 6;

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function startOfMonth(date: Date): Date {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfMonth(date: Date): Date {
  const d = startOfMonth(addMonths(date, 1));
  d.setMilliseconds(d.getMilliseconds() - 1);
  return d;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function toIsoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseIsoDate(value: string | undefined | null): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const d = new Date(year, month, day);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

/**
 * Build a 6×7 grid of dates covering the calendar month containing `anchor`.
 * Week starts on Monday (locale-agnostic for now).
 */
export function buildMonthGrid(anchor: Date): Date[] {
  const monthStart = startOfMonth(anchor);
  // getDay(): 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  // We want the offset to the previous Monday.
  const dayOfWeek = monthStart.getDay();
  const offsetToMonday = (dayOfWeek + 6) % 7;
  const gridStart = addDays(monthStart, -offsetToMonday);

  const cells: Date[] = [];
  for (let i = 0; i < WEEKS_IN_MONTH_GRID * DAYS_IN_WEEK; i++) {
    cells.push(addDays(gridStart, i));
  }
  return cells;
}

export function buildWeekdayLabels(locale: string): string[] {
  // Anchor: Monday 2024-01-01 was a Monday — convenient base for labels.
  const monday = new Date(2024, 0, 1);
  const formatter = new Intl.DateTimeFormat(locale, { weekday: "short" });
  return Array.from({ length: DAYS_IN_WEEK }, (_, i) =>
    formatter.format(addDays(monday, i)),
  );
}
