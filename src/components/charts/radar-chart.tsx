import { useState } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Line, Polygon } from "react-native-svg";

import { Text } from "@/components/ui/text";
import { useTheme } from "@/theme";

export type RadarPoint = {
  /** Short label — full weekday names collide around a phone-width circle. */
  label: string;
  /**
   * Null when this weekday holds no published figure — a reading the sweep
   * never captured, or one the portal batched into a neighbouring day. Such a
   * spoke gets no vertex: the loop closes across it with a dashed edge, the
   * same language the trend line uses for a stretch it did not measure.
   * Plotting it at zero would state that nothing was spent, which is a
   * different claim and the one a reader acts on.
   */
  value: number | null;
};

const SIZE = 200;
/** Room outside the outer ring for the labels. */
const LABEL_INSET = 26;
const RINGS = 3;

/**
 * Cost per weekday, drawn as a closed loop.
 *
 * The circle is doing real work here: weekdays wrap, so Sunday genuinely is
 * adjacent to Monday and the shape traces a repeating rhythm. That is the one
 * property that makes a radar honest — for a date range, which does not wrap,
 * a line says the same thing without implying a cycle that isn't there.
 *
 * The known cost is that filled area grows with the square of the radius, so
 * differences read larger than they are. Values are printed on the labels for
 * that reason: the shape is for spotting the pattern, the numbers for reading
 * it.
 */
export function RadarChart({ points }: { points: RadarPoint[] }) {
  const { colors } = useTheme();
  const [width, setWidth] = useState(0);

  const size = Math.min(width || SIZE, SIZE);
  const center = size / 2;
  const radius = center - LABEL_INSET;
  const max = Math.max(...points.map((point) => point.value ?? 0), 0);

  /**
   * Every spoke at zero collapses the polygon onto the centre point, which
   * reads as a rendering failure rather than as an idle week. So the shape is
   * dropped and the web is drawn on its own — rings, spokes and labels, with
   * nothing plotted on them. An empty grid is a recognisable "nothing here";
   * a dot at the origin is not.
   */
  const hasShape = max > 0;
  const scale = hasShape ? radius / max : 0;

  const vertex = (index: number, distance: number) => {
    // Starts at twelve o'clock and runs clockwise, so the first label sits
    // where the eye lands rather than on the right-hand edge.
    const angle = (index / points.length) * 2 * Math.PI - Math.PI / 2;
    return {
      x: center + Math.cos(angle) * distance,
      y: center + Math.sin(angle) * distance,
    };
  };

  /** Only the days with a figure. Spokes without one carry no vertex at all. */
  const plotted = points.flatMap((point, index) =>
    point.value === null ? [] : [{ ...vertex(index, point.value * scale), index }],
  );

  const polygon = plotted.map(({ x, y }) => `${x},${y}`).join(" ");

  /**
   * Edge by edge rather than one closed path, because an edge that jumps over
   * an unknown spoke is dashed and a single polygon can only carry one dash
   * pattern. Wraps at the end: weekdays are a cycle, so the last known day
   * joins back to the first.
   */
  const edges =
    plotted.length < 2
      ? []
      : plotted.map((from, order) => {
          const to = plotted[(order + 1) % plotted.length];
          const spokesApart =
            (to.index - from.index + points.length) % points.length;

          return { from, to, skipsUnknown: spokesApart > 1 };
        });

  const ring = (fraction: number) =>
    points
      .map((_, index) => {
        const { x, y } = vertex(index, radius * fraction);
        return `${x},${y}`;
      })
      .join(" ");

  return (
    <View
      style={styles.container}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <View style={{ width: size, height: size }}>
        <Svg width={size} height={size}>
          {Array.from({ length: RINGS }, (_, index) => (
            <Polygon
              key={index}
              points={ring((index + 1) / RINGS)}
              fill="none"
              stroke={colors.border}
              strokeWidth={1}
            />
          ))}

          {points.map((point, index) => {
            const { x, y } = vertex(index, radius);
            return (
              <Line
                key={index}
                x1={center}
                y1={center}
                x2={x}
                y2={y}
                stroke={colors.border}
                strokeWidth={1}
                // A dashed spoke marks a day the week has no figure for, so the
                // gap is legible on the grid itself and not only in the shape.
                strokeDasharray={point.value === null ? "3 3" : undefined}
              />
            );
          })}

          {hasShape ? (
            <>
              {/* Boundary drawn separately below, so the edges can differ. */}
              <Polygon
                points={polygon}
                fill={colors.primary}
                fillOpacity={0.18}
                stroke="none"
              />

              {edges.map(({ from, to, skipsUnknown }, index) => (
                <Line
                  key={index}
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke={colors.primary}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeDasharray={skipsUnknown ? "3 3" : undefined}
                />
              ))}

              {plotted.map(({ x, y, index }) => (
                <Circle key={index} cx={x} cy={y} r={3} fill={colors.primary} />
              ))}
            </>
          ) : null}
        </Svg>

        {points.map((point, index) => {
          const { x, y } = vertex(index, radius + 14);
          return (
            <Text
              key={index}
              variant="micro"
              style={[
                styles.label,
                {
                  // Dimmed when there is no figure behind the spoke, matching
                  // the dashed grid line it labels.
                  color:
                    point.value === null
                      ? colors.textTertiary
                      : colors.textSecondary,
                  // Centred on the vertex by offsetting half the label box,
                  // so labels sit evenly around the ring instead of hanging
                  // off to one side of it.
                  left: x - LABEL_INSET,
                  top: y - 7,
                  width: LABEL_INSET * 2,
                },
              ]}>
              {point.label}
            </Text>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center" },
  label: { position: "absolute", textAlign: "center" },
});
