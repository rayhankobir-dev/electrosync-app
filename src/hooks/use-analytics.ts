import { useQuery } from "@tanstack/react-query";

import type {
  UsageAnalytics,
  UsageAnalyticsQuery,
  UsagePoint,
} from "@/api/types";
import { useApi } from "@/session";

/** Days of history the weekday view averages over. */
export const RHYTHM_WINDOW_DAYS = 28;

export const RHYTHM_MIN_OBSERVED_DAYS = 0;

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
  const span = TREND_WINDOW_DAYS * 2;
  const from = shiftDays(today, -(span - 1));

  const query = useUsageAnalytics({
    granularity: "daily",
    from,
    to: today,
    meterId,
  });

  /**
   * Padded to the full window before slicing. The backend omits days it holds no
   * samples for, so a fresh account comes back with `points: []` and one with a
   * few days of history comes back short — and a chart drawn straight from that
   * either renders nothing or silently relabels three days as a week.
   *
   * Padding only once the request has settled: an empty array during the fetch
   * would otherwise become a full week of zeroes and flash a chart of nothing
   * before the real numbers arrive.
   */
  const points = query.data ? padDays(query.data.points, from, span) : [];
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
    /**
     * Yesterday rather than today, for the home card's headline figure. Today is
     * still being lived: its bucket only holds the hours the sweep has already
     * sampled, so quoting it would show a number that climbs all day and reads
     * low every morning. Yesterday is the most recent complete day.
     *
     * Null when the day carries no readings at all — see `padDays`. The caller
     * decides whether to print a zero or say nothing was measured.
     */
    yesterday: current.at(-2) ?? null,
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

/**
 * Fills a daily series out to every date in its window.
 *
 * A day the sweep never sampled is added at zero with `coverage: 0`, which is
 * the same shape the backend uses for a partly-measured day — so the chart draws
 * it hollow and dashed rather than as a confident zero. That distinction is the
 * whole point: "you spent nothing" and "we have no reading" are different
 * claims, and padding must not quietly turn the second into the first.
 */
function padDays(
  points: UsagePoint[],
  from: string,
  days: number,
): UsagePoint[] {
  const byDate = new Map(
    points.filter((point) => point.date).map((point) => [point.date, point]),
  );

  return Array.from({ length: days }, (_, index) => {
    const date = shiftDays(from, index);
    return (
      byDate.get(date) ?? {
        date,
        consumedCost: 0,
        rechargedAmount: 0,
        coverage: 0,
      }
    );
  });
}
