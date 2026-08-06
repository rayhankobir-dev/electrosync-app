import { useState } from "react";
import { StyleSheet, View } from "react-native";
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Stop,
} from "react-native-svg";

import { Text } from "@/components/ui/text";
import { Spacing, useTheme } from "@/theme";

export type LinePoint = {
  /** Axis label, already localised. */
  label: string;
  value: number;
  /**
   * The bucket is missing readings, so `value` is a floor rather than a total.
   * Drawn hollow and joined with a dashed segment, because a low bar and a
   * partly-unmeasured bar are different claims and should not look alike.
   */
  partial?: boolean;
};

const CHART_HEIGHT = 132;
/** Keeps the topmost marker's stroke inside the viewport. */
const PADDING_TOP = 10;
const PADDING_BOTTOM = 6;
const GUTTER = 34;
const DOT_RADIUS = 3.5;
const GRID_LINES = 3;

/**
 * Rounds an axis maximum up to a value a person would have chosen.
 *
 * Left raw, the top gridline reads "৳171.63", which invites the eye to decode a
 * number that carries no meaning — it is just the largest sample. Snapping to
 * 1/2/5 × 10ⁿ gives an axis whose labels can be read at a glance and compared
 * between two charts drawn on different days.
 */
function niceMax(max: number): number {
  if (max <= 0) return 1;

  const magnitude = 10 ** Math.floor(Math.log10(max));
  const normalised = max / magnitude;

  if (normalised <= 1) return magnitude;
  if (normalised <= 2) return 2 * magnitude;
  if (normalised <= 5) return 5 * magnitude;
  return 10 * magnitude;
}

function formatAxis(value: number): string {
  if (value >= 1000) return `${Math.round(value / 100) / 10}k`;
  return String(Math.round(value));
}

export function LineChart({ points }: { points: LinePoint[] }) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);

  const plotWidth = Math.max(width - GUTTER, 0);
  const plotHeight = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
  const max = niceMax(Math.max(...points.map((point) => point.value), 0));

  // Measured before the first paint has a width, so there is nothing to lay
  // out against yet. Rendering the frame anyway would flash a chart squeezed
  // into zero pixels.
  const ready = plotWidth > 0 && points.length > 0;

  const x = (index: number) =>
    points.length === 1
      ? plotWidth / 2
      : (index / (points.length - 1)) * plotWidth;

  const y = (value: number) =>
    PADDING_TOP + plotHeight - (value / max) * plotHeight;

  const coords = points.map((point, index) => ({
    x: x(index),
    y: y(point.value),
    partial: point.partial ?? false,
  }));

  const areaPath = ready
    ? [
        `M ${coords[0].x} ${coords[0].y}`,
        ...coords.slice(1).map((point) => `L ${point.x} ${point.y}`),
        `L ${coords[coords.length - 1].x} ${PADDING_TOP + plotHeight}`,
        `L ${coords[0].x} ${PADDING_TOP + plotHeight}`,
        "Z",
      ].join(" ")
    : "";

  return (
    <View>
      <View style={styles.row} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
        <View style={styles.gutter}>
          {Array.from({ length: GRID_LINES }, (_, index) => {
            const value = max * (1 - index / (GRID_LINES - 1));
            return (
              <Text
                key={index}
                variant="micro"
                style={[
                  styles.axisLabel,
                  { color: colors.textTertiary, top: y(value) - 7 },
                ]}>
                {formatAxis(value)}
              </Text>
            );
          })}
        </View>

        {ready ? (
          <Svg width={plotWidth} height={CHART_HEIGHT}>
            <Defs>
              <LinearGradient id="usageFill" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.primary} stopOpacity="0.22" />
                <Stop offset="1" stopColor={colors.primary} stopOpacity="0" />
              </LinearGradient>
            </Defs>

            {Array.from({ length: GRID_LINES }, (_, index) => {
              const gridY = y(max * (1 - index / (GRID_LINES - 1)));
              return (
                <Line
                  key={index}
                  x1={0}
                  y1={gridY}
                  x2={plotWidth}
                  y2={gridY}
                  stroke={colors.border}
                  strokeWidth={1}
                />
              );
            })}

            <Path d={areaPath} fill="url(#usageFill)" />

            {/*
              Drawn segment by segment rather than as one path: a segment
              touching an incomplete bucket is dashed, and a single path can
              only carry one dash pattern for its whole length.
            */}
            {coords.slice(1).map((point, index) => {
              const from = coords[index];
              const incomplete = from.partial || point.partial;

              return (
                <Line
                  key={index}
                  x1={from.x}
                  y1={from.y}
                  x2={point.x}
                  y2={point.y}
                  stroke={colors.primary}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeDasharray={incomplete ? "3 3" : undefined}
                />
              );
            })}

            {coords.map((point, index) => (
              <Circle
                key={index}
                cx={point.x}
                cy={point.y}
                r={DOT_RADIUS}
                // Hollow means "we did not see all of this day". Filling it
                // would state a total the data cannot support.
                fill={point.partial ? colors.surface : colors.primary}
                stroke={colors.primary}
                strokeWidth={point.partial ? 2 : 0}
              />
            ))}
          </Svg>
        ) : (
          <View style={{ height: CHART_HEIGHT }} />
        )}
      </View>

      <View style={[styles.labels, { paddingLeft: GUTTER }]}>
        {points.map((point, index) => (
          <Text
            key={index}
            variant="micro"
            style={{ color: colors.textTertiary }}>
            {point.label}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-start" },
  gutter: { width: GUTTER, height: CHART_HEIGHT },
  axisLabel: { position: "absolute", left: 0 },
  labels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: Spacing.xs,
  },
});
