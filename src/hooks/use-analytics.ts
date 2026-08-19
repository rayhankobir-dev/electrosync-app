import { useQuery } from "@tanstack/react-query";

import type {
  UsageAnalytics,
  UsageAnalyticsQuery,
  UsagePoint,
} from "@/api/types";
import { portalMonthNumber } from "@/i18n";
import { useApi } from "@/session";
import type { UtilityMonthlyConsumption } from "@/utility";

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

/**
 * Days of history before a burn rate is worth quoting.
 *
 * A week, so the rate has seen both a weekend and a working week. Below this
 * the mean is one or two days wearing a month's clothing — and the figure it
 * produces ("your balance lasts 40 days") is exactly the kind a user acts on.
 */
export const RUNWAY_MIN_OBSERVED_DAYS = 7;

/**
 * Beyond this the runway stops being a countdown and starts being a shrug.
 * Capped rather than printed, so a meter idling at a few poisha a day cannot
 * render "1,240 days" in a column three characters wide.
 */
export const RUNWAY_MAX_DAYS = 90;

/**
 * What a full day costs this meter, from the weekday means.
 *
 * Not `sum(points) / 7`. The backend divides each weekday by the days it
 * actually observed, and reports `coverage` as the fraction of a day its
 * samples span — so a point is "the mean cost of the 62% of a Tuesday we
 * watched", not "a Tuesday". Dividing cost by coverage rather than by a day
 * count fixes both distortions at once: weekdays with no readings contribute
 * to neither side of the ratio, and a partly-sampled day is scaled up to the
 * full day it stands for instead of being averaged in as cheap electricity.
 *
 * Null when the history is too thin — see `RUNWAY_MIN_OBSERVED_DAYS` — or when
 * nothing was covered at all. Null rather than 0: "we cannot say" and "you
 * spend nothing" lead to opposite advice.
 */
export function dailyBurnRate(
  points: readonly UsagePoint[],
  observedDays: number,
): number | null {
  if (observedDays < RUNWAY_MIN_OBSERVED_DAYS) return null;

  const covered = points.reduce((total, point) => total + point.coverage, 0);
  if (covered <= 0) return null;

  return sum(points) / covered;
}

/**
 * Whole days the balance covers at that rate.
 *
 * Floored, so the number is a promise the meter can keep: at ৳40 a day, ৳515
 * is twelve days and change, and rounding that to thirteen invites the user to
 * plan a recharge for the morning after the lights go out.
 *
 * Null unless every input supports an answer — an unknown or spent balance, or
 * a rate we could not measure. Returning `Infinity` for a zero rate would put
 * a literal "∞ days" in the card.
 */
export function estimateRunwayDays(
  balance: number | null,
  dailyRate: number | null,
): number | null {
  if (balance === null || balance <= 0) return null;
  if (dailyRate === null || dailyRate <= 0) return null;

  return Math.floor(balance / dailyRate);
}

/**
 * A daily rate from the portal's monthly consumption instead of our own samples.
 *
 * The fallback for a meter the sweep has not watched for `RUNWAY_MIN_OBSERVED_DAYS`
 * yet — a meter added this week, or any meter if the sweep has been down. The
 * portal's monthly rows reach back months and arrive with the first load, so this
 * answers on a meter's very first open, where `dailyBurnRate` can only shrug.
 *
 * Coarser than the sampled rate, and deliberately second in line: one figure for
 * a whole month cannot see that the last fortnight was hotter than the first, and
 * the sampled rate can. Callers are expected to mark what this produces as an
 * estimate.
 *
 * **The current month is skipped, and that is the load-bearing part.** Its row
 * holds usage-so-far, not a month, so dividing it by the month's full length
 * would report a fraction of the true burn — a month 10 days in reads as a third
 * of the real rate and triples the runway. Overstating is the harmful direction:
 * it invites a recharge planned for after the supply has already cut out.
 *
 * Scans newest to oldest for the first complete month that actually drew
 * something, so a month the meter sat idle falls through to a real one instead of
 * reporting a zero rate.
 */
export function monthlyDailyRate(
  rows: readonly UtilityMonthlyConsumption[],
  now: Date,
): number | null {
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const complete = rows
    .map((row) => ({ row, month: portalMonthNumber(row.month) }))
    .filter(
      (entry): entry is { row: UtilityMonthlyConsumption; month: number } =>
        entry.month !== null &&
        // Strictly before the month we are standing in.
        (entry.row.year < currentYear ||
          (entry.row.year === currentYear && entry.month < currentMonth)),
    )
    .sort((a, b) => b.row.year * 12 + b.month - (a.row.year * 12 + a.month));

  for (const { row, month } of complete) {
    if (row.totalUsageAmount <= 0) continue;

    // Day 0 of the next month is the last day of this one, which is also how the
    // month's length is read without a leap-year table.
    const days = new Date(row.year, month, 0).getDate();
    if (days > 0) return row.totalUsageAmount / days;
  }

  return null;
}

/**
 * How long the current balance lasts at the meter's recent daily average.
 *
 * Reads the same 28-day query as `useWeekdayRhythm` — same key, so React Query
 * hands the home screen one instance and this costs no extra request wherever
 * the rhythm card is already on screen.
 */
export function useBalanceRunway(balance: number | null, meterId?: string) {
  const { points, observedDays, isPending } = useWeekdayRhythm(meterId);

  const dailyRate = dailyBurnRate(points, observedDays);

  return {
    isPending,
    dailyRate,
    days: estimateRunwayDays(balance, dailyRate),
  };
}

function sum(points: readonly { consumedCost: number }[]): number {
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
