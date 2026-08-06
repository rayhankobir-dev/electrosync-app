import type { TranslationKey } from '@/i18n';

const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * Picks a translation key and its count for a past timestamp.
 *
 * Returns the key rather than a formatted string so the caller runs it through
 * `t()` — that keeps the plural/wording decision inside the locale files and
 * the digits inside `formatNumber`, which is what renders Bangla numerals.
 *
 * Anything older than a week falls back to an absolute date: "9d ago" is
 * harder to place than the date itself.
 */
export function relativeTime(
  epochSeconds: number,
  nowMs: number = Date.now(),
): { key: TranslationKey; count: number } | { absolute: true } {
  const elapsed = Math.max(0, Math.floor(nowMs / 1000 - epochSeconds));

  if (elapsed < MINUTE) return { key: 'notifications.justNow', count: 0 };
  if (elapsed < HOUR) {
    return { key: 'notifications.minutesAgo', count: Math.floor(elapsed / MINUTE) };
  }
  if (elapsed < DAY) {
    return { key: 'notifications.hoursAgo', count: Math.floor(elapsed / HOUR) };
  }
  if (elapsed < 7 * DAY) {
    return { key: 'notifications.daysAgo', count: Math.floor(elapsed / DAY) };
  }

  return { absolute: true };
}

/** ISO 8601 string to Unix epoch seconds, which is what the formatters take. */
export function isoToEpochSeconds(iso: string): number {
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? Number.NaN : Math.floor(ms / 1000);
}
