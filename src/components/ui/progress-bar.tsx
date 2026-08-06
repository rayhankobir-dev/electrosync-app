import { StyleSheet, View } from "react-native";

import { Radius, useTheme, type ColorName } from "@/theme";

export function ProgressBar({
  value,
  color = "primary",
  height = 6,
}: {
  value: number;
  color?: ColorName;
  height?: number;
}) {
  const { colors } = useTheme();
  const fraction = Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(fraction * 100) }}
      style={[
        styles.track,
        { height, borderRadius: height / 2, backgroundColor: colors.skeleton },
      ]}
    >
      <View
        style={{
          width: `${fraction * 100}%`,
          height: "100%",
          borderRadius: height / 2,
          backgroundColor: colors[color],
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    width: "100%",
    overflow: "hidden",
    borderRadius: Radius.full,
  },
});
