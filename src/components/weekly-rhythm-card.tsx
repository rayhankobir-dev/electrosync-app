import { StyleSheet, View } from "react-native";

import { RadarChart, type RadarPoint } from "@/components/charts/radar-chart";
import { Card } from "@/components/ui/card";
import { Text } from "@/components/ui/text";
import {
  RHYTHM_MIN_OBSERVED_DAYS,
  RHYTHM_WINDOW_DAYS,
  useWeekdayRhythm,
} from "@/hooks/use-analytics";
import { useI18n } from "@/i18n";
import { Spacing } from "@/theme";

/**
 * Mean cost per weekday over the last four weeks.
 *
 * A week with nothing recorded draws the empty web — seven spokes, no shape —
 * rather than disappearing. The card vanishing entirely was indistinguishable
 * from the screen having failed to load it, and an account that has genuinely
 * spent nothing is entitled to see that stated rather than inferred from a gap.
 */
export function WeeklyRhythmCard({ meterId }: { meterId?: string }) {
  const { t, formatNumber } = useI18n();
  const { points, hasEnoughHistory, isLoading, isError } =
    useWeekdayRhythm(meterId);

  if (isLoading || isError || !hasEnoughHistory) return null;

  // Seven spokes, always — a weekday with no readings is drawn at zero rather
  // than dropped, because a five-sided "week" would read as a data shape
  // instead of a gap.
  const byWeekday = new Map(
    points.map((point) => [point.weekday, point.consumedCost]),
  );

  const radarPoints: RadarPoint[] = Array.from({ length: 7 }, (_, index) => {
    const isoDay = index + 1;
    return {
      label: t(`analytics.weekday.${isoDay}` as never),
      value: byWeekday.get(isoDay) ?? 0,
    };
  });

  return (
    <Card>
      <Text variant="subhead" color="textSecondary">
        {t("analytics.rhythmTitle")}
      </Text>
      <Text variant="micro" color="textTertiary">
        {/* Through `formatNumber`, not interpolated raw: `t` substitutes with a
            bare `String(...)`, so a number handed straight over renders "28"
            mid-sentence under `bn` while every other figure on the screen reads
            ২৮. */}
        {t("analytics.rhythmSubtitle", {
          days: formatNumber(RHYTHM_WINDOW_DAYS),
        })}
      </Text>

      <View style={styles.chart}>
        <RadarChart points={radarPoints} />
      </View>
    </Card>
  );
}

export { RHYTHM_MIN_OBSERVED_DAYS };

const styles = StyleSheet.create({
  chart: { marginTop: Spacing.md },
});
