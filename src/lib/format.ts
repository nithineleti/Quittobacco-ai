/**
 * Pure formatting + date helpers. No React, no store access.
 * All dates are handled in the device's LOCAL time so "days free" matches the
 * user's own calendar. Date-only strings ("YYYY-MM-DD") are parsed as local
 * midnight — not UTC — to avoid off-by-one shifts across time zones.
 */

/** Always returns a fresh Date. "YYYY-MM-DD" is parsed as local, not UTC. */
export function toDate(d: Date | string): Date {
  if (d instanceof Date) return new Date(d.getTime());
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(d);
}

export const parseLocalDate = toDate;

export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

export function formatNumber(n: number, locale = "en-IN"): string {
  return new Intl.NumberFormat(locale).format(n);
}

/** Midnight (local) of the given date. */
export function startOfDay(d: Date | string): Date {
  const x = toDate(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date | string, n: number): Date {
  const x = toDate(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** Whole calendar days from `a` to `b` (local). Negative if b precedes a. */
export function daysBetween(a: Date | string, b: Date | string): number {
  const from = startOfDay(a).getTime();
  const to = startOfDay(b).getTime();
  return Math.round((to - from) / 86_400_000);
}

/** Local YYYY-MM-DD (never UTC-shifted). */
export function toISODate(d: Date | string): string {
  const x = toDate(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, "0");
  const day = String(x.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function formatDate(
  d: Date | string,
  locale = "en-IN",
  opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" },
): string {
  return new Intl.DateTimeFormat(locale, opts).format(toDate(d));
}

/** "today" / "yesterday" / "3 days ago" style relative label. */
export function formatRelativeDay(
  d: Date | string,
  now: Date | string = new Date(),
  locale = "en",
): string {
  const diff = daysBetween(now, d);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  return rtf.format(diff, "day");
}

/** Compact duration label for a number of days, e.g. 45 → "1 month, 15 days". */
export function humanizeDays(days: number): string {
  if (days <= 0) return "0 days";
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);
  const rest = days % 30;
  const parts: string[] = [];
  if (years) parts.push(`${years} ${years === 1 ? "year" : "years"}`);
  if (months) parts.push(`${months} ${months === 1 ? "month" : "months"}`);
  if (rest || parts.length === 0) parts.push(`${rest} ${rest === 1 ? "day" : "days"}`);
  return parts.join(", ");
}
