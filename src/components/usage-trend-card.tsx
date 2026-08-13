import { ActivityIndicator, StyleSheet, View } from "react-native";

import type { UsagePoint } from "@/api/types";
import { LineChart, type LinePoint } from "@/components/charts/line-chart";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import { useUsageTrend } from "@/hooks/use-analytics";
import { useI18n } from "@/i18n";
import { Spacing } from "@/theme";

/** Below this the reading is treated as an incomplete day. */
const FULL_COVERAGE = 0.99;

export function UsageTrendCard({ meterId }: { meterId?: string }) {
  const { t, formatCurrency } = useI18n();
  const { points, total, changeRatio, isLoading, isError } =
    useUsageTrend(meterId);

  if (isLoading) {
    return (
      <Card>
        <Text variant="subhead" color="textSecondary">
          {t("analytics.trendTitle")}
        </Text>
        <View style={styles.placeholder}>
          <ActivityIndicator />
        </View>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <Text variant="subhead" color="textSecondary">
          {t("analytics.trendTitle")}
        </Text>
        <Text variant="footnote" color="danger" style={styles.gap}>
          {t("analytics.loadFailed")}
        </Text>
      </Card>
    );
  }

  /*
    No empty state. `useUsageTrend` pads the window to a full seven days, so an
    account with nothing recorded yet gets a flat line at zero and a ৳0 headline
    rather than a card explaining that there is no data — which is what "no data"
    looks like anyway, said twice.

    The distinction between "spent nothing" and "not measured" is not lost: the
    padded days carry `coverage: 0`, so they draw hollow and dashed, and the note
    under the chart says so.
  */
  const chartPoints = points.map(
    (point): LinePoint => ({
      label: weekdayLabel(point, t),
      value: point.consumedCost,
      partial: point.coverage < FULL_COVERAGE,
    }),
  );

  const hasPartial = chartPoints.some((point) => point.partial);

  return (
    <Card>
      <Text variant="subhead" color="textSecondary">
        {t("analytics.trendTitle")}
      </Text>

      <View style={styles.headline}>
        {/*
          `formatCurrency`, not `Intl.NumberFormat("bn-BD")`. Intl's digit
          output depends on the JS engine shipping ICU data for the locale,
          which Hermes does not guarantee — so the app's largest figure was
          betting on it while every other number used the app's own localiser.
          This also drops a hardcoded ৳ that duplicated `common.currencySymbol`.
        */}
        <Text variant="title1" numeric>
          {formatCurrency(total, 0)}
        </Text>
        {changeRatio !== null ? <Delta ratio={changeRatio} /> : null}
      </View>

      <View style={styles.chart}>
        <LineChart points={chartPoints} />
      </View>

      {hasPartial ? (
        <Text variant="micro" color="textTertiary" style={styles.gap}>
          {t("analytics.partialNote")}
        </Text>
      ) : null}
    </Card>
  );
}

/**
 * Week-on-week change.
 *
 * Coloured by direction rather than by sentiment — spending less is green
 * because it is cheaper, which is the only reading that holds for a
 * prepaid meter.
 */
function Delta({ ratio }: { ratio: number }) {
  const { t, formatNumber } = useI18n();

  const up = ratio > 0;
  // Through `formatNumber` rather than interpolated raw: a bare `{percent}` is
  // whatever JS stringifies, which is Latin digits in every locale.
  const percent = formatNumber(Math.abs(Math.round(ratio * 100)));

  return (
    <View style={styles.delta}>
      <Text variant="caption" color={up ? "warning" : "success"} numeric>
        {up ? "↑" : "↓"} {percent}%
      </Text>
      <Text variant="micro" color="textTertiary">
        {t("analytics.vsLastWeek")}
      </Text>
    </View>
  );
}

function weekdayLabel(
  point: UsagePoint,
  t: (key: never) => string,
): string {
  if (!point.date) return "";

  // Parsed as UTC so the label matches the Dhaka date the backend assigned,
  // rather than being shifted by the device's own timezone.
  const isoDay = new Date(`${point.date}T00:00:00Z`).getUTCDay();
  // getUTCDay is 0=Sunday; the translation table is ISO, 1=Monday…7=Sunday.
  const key = `analytics.weekday.${isoDay === 0 ? 7 : isoDay}` as never;

  return t(key);
}

const styles = StyleSheet.create({
  placeholder: { height: 132, justifyContent: "center" },
  gap: { marginTop: Spacing.sm },
  headline: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginTop: Spacing.xs,
  },
  delta: { alignItems: "flex-end" },
  chart: { marginTop: Spacing.lg },
});
