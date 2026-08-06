import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Svg, { Circle } from "react-native-svg";

import { useTheme, type ColorName } from "@/theme";

/**
 * Circular progress drawn with `strokeDasharray`: the circumference is the
 * dash length, and the offset shortens the visible arc. No animation library
 * and no extra dependency — react-native-svg is already present for the icons.
 */
export function ProgressRing({
  value,
  size = 132,
  thickness = 10,
  color = "primary",
  children,
}: {
  value: number;
  size?: number;
  thickness?: number;
  color?: ColorName;
  children?: ReactNode;
}) {
  const { colors } = useTheme();
  const fraction = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;

  // Inset by half the stroke so the ring's outer edge sits inside the viewbox
  // instead of being clipped.
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(fraction * 100) }}
      style={{ width: size, height: size }}
    >
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.skeleton}
          strokeWidth={thickness}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors[color]}
          strokeWidth={thickness}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fraction)}
          // Rotated so the arc starts at 12 o'clock rather than 3 o'clock.
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>

      {children ? <View style={styles.center}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: "center",
    justifyContent: "center",
  },
});
