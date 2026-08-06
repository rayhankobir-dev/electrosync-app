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
 * Renders nothing at all until there is enough history — deliberately, rather
 * than showing an empty or locked card. A weekly pattern is the kind of claim
 * that looks equally convincing whether or not the data supports it, so the
 * honest default is silence until it does.
 */
export function WeeklyRhythmCard({ meterId }: { meterId?: string }) {
  const { t } = useI18n();
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

  if (radarPoints.every((point) => point.value === 0)) return null;

  return (
    <Card>
      <Text variant="subhead" color="textSecondary">
        {t("analytics.rhythmTitle")}
      </Text>
      <Text variant="micro" color="textTertiary">
        {t("analytics.rhythmSubtitle", { days: RHYTHM_WINDOW_DAYS })}
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
