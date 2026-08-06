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
  const { t, locale } = useI18n();
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

  // An empty series and a series of zeroes mean different things: the first is
  // "we have not measured yet", the second is "you used nothing". Only the
  // first justifies replacing the chart with an explanation.
  if (points.length === 0) {
    return (
      <Card>
        <Text variant="title3">{t("analytics.emptyTitle")}</Text>
        <Text variant="footnote" color="textSecondary" style={styles.emptyBody}>
          {t("analytics.emptyBody")}
        </Text>
      </Card>
    );
  }

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
        <Text variant="title1" numeric>৳{formatMoney(total, locale)}</Text>
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
  const { t } = useI18n();

  const up = ratio > 0;
  const percent = Math.abs(Math.round(ratio * 100));

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

function formatMoney(value: number, locale: string): string {
  return new Intl.NumberFormat(locale === "bn" ? "bn-BD" : "en-US", {
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

const styles = StyleSheet.create({
  placeholder: { height: 132, justifyContent: "center" },
  gap: { marginTop: Spacing.sm },
  emptyBody: { marginTop: Spacing.xs },
  headline: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginTop: Spacing.xs,
  },
  delta: { alignItems: "flex-end" },
  chart: { marginTop: Spacing.lg },
});
