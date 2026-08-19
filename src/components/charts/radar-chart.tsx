import { useState } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle, Line, Polygon } from "react-native-svg";

import { Text } from "@/components/ui/text";
import { useTheme } from "@/theme";

export type RadarPoint = {
  /** Short label — full weekday names collide around a phone-width circle. */
  label: string;
  value: number;
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
  const max = Math.max(...points.map((point) => point.value), 0);

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

  const polygon = points
    .map((point, index) => {
      const { x, y } = vertex(index, point.value * scale);
      return `${x},${y}`;
    })
    .join(" ");

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

          {points.map((_, index) => {
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
              />
            );
          })}

          {hasShape ? (
            <>
              <Polygon
                points={polygon}
                fill={colors.primary}
                fillOpacity={0.18}
                stroke={colors.primary}
                strokeWidth={2}
                strokeLinejoin="round"
              />

              {points.map((point, index) => {
                const { x, y } = vertex(index, point.value * scale);
                return (
                  <Circle key={index} cx={x} cy={y} r={3} fill={colors.primary} />
                );
              })}
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
                  color: colors.textSecondary,
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
