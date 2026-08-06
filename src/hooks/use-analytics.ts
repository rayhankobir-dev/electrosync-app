import { useQuery } from "@tanstack/react-query";

import type { UsageAnalytics, UsageAnalyticsQuery } from "@/api/types";
import { useApi } from "@/session";

/** Days of history the weekday view averages over. */
export const RHYTHM_WINDOW_DAYS = 28;

/**
 * Days of readings before the weekday average is worth showing.
 *
 * A "pattern" drawn from one week is just that week redrawn in a circle. Two
 * weeks is the point where a repeated shape starts to mean something rather
 * than being the only shape available.
 */
export const RHYTHM_MIN_OBSERVED_DAYS = 14;

/** Days shown in the trend line. */
export const TREND_WINDOW_DAYS = 7;

export const analyticsKeys = {
  usage: (query: UsageAnalyticsQuery) =>
    [
      "analytics",
      "usage",
      query.granularity,
      query.from,
      query.to,
      query.meterId ?? "all",
    ] as const,
};

/**
 * Today's date on the Dhaka calendar, as `YYYY-MM-DD`.
 *
 * The device clock is whatever timezone the phone is in, which for a traveller
 * is not Dhaka — and the backend buckets everything in Dhaka. Formatting via
 * `Intl` with an explicit zone is what keeps "today" on the chart and "today"
 * in the database the same day. `en-CA` is used purely because its short date
 * format is ISO-ordered.
 */
export function dhakaToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/**
 * Shifts a `YYYY-MM-DD` date by whole days.
 *
 * Parsed as UTC midnight rather than local: the string carries no zone, and
 * letting the device interpret it would shift the result by a day for anyone
 * west of Greenwich. Nothing here needs a real instant — only calendar
 * arithmetic — and UTC is the one reading that never drifts.
 */
export function shiftDays(date: string, days: number): string {
  const base = Date.parse(`${date}T00:00:00Z`);
  return new Date(base + days * 86_400_000).toISOString().slice(0, 10);
}

export function useUsageAnalytics(
  query: UsageAnalyticsQuery,
  options: { enabled?: boolean } = {},
) {
  const api = useApi();

  return useQuery<UsageAnalytics>({
    queryKey: analyticsKeys.usage(query),
    enabled: options.enabled ?? true,
    queryFn: () => api.analytics.usage(query),
    // Samples only change when the sweep runs, which is every few hours.
    // Refetching more eagerly would spend requests re-fetching identical rows.
    staleTime: 15 * 60 * 1000,
  });
}

/**
 * Daily costs for the trend card.
 *
 * Fetches twice the window on purpose: the chart draws the most recent seven
 * days, and the seven before them are what "up 12% on last week" is measured
 * against. One request rather than two, since the backend returns both halves
 * in a single series.
 */
export function useUsageTrend(meterId?: string) {
  const today = dhakaToday();

  const query = useUsageAnalytics({
    granularity: "daily",
    from: shiftDays(today, -(TREND_WINDOW_DAYS * 2 - 1)),
    to: today,
    meterId,
  });

  const points = query.data?.points ?? [];
  const current = points.slice(-TREND_WINDOW_DAYS);
  const previous = points.slice(0, -TREND_WINDOW_DAYS);

  const currentTotal = sum(current);
  const previousTotal = sum(previous);

  return {
    ...query,
    points: current,
    total: currentTotal,
    /**
     * Fractional change against the previous week, or null when there is
     * nothing to compare to. Null rather than 0 or Infinity: a first week has
     * no trend, and rendering "+100%" for it would be an invention.
     */
    changeRatio:
      previous.length === 0 || previousTotal === 0
        ? null
        : (currentTotal - previousTotal) / previousTotal,
    observedDays: query.data?.observedDays ?? 0,
  };
}

/** Mean cost per weekday, and whether there is enough history to show it. */
export function useWeekdayRhythm(meterId?: string) {
  const today = dhakaToday();

  const query = useUsageAnalytics({
    granularity: "weekday",
    from: shiftDays(today, -(RHYTHM_WINDOW_DAYS - 1)),
    to: today,
    meterId,
  });

  const observedDays = query.data?.observedDays ?? 0;

  return {
    ...query,
    points: query.data?.points ?? [],
    observedDays,
    hasEnoughHistory: observedDays >= RHYTHM_MIN_OBSERVED_DAYS,
  };
}

function sum(points: { consumedCost: number }[]): number {
  return points.reduce((total, point) => total + point.consumedCost, 0);
}
