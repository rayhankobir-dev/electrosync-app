import type { ReactNode } from "react";
import { useEffect } from "react";
import { View, type DimensionValue } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { Radius, useTheme } from "@/theme";

/** One full breath. Slow enough to read as waiting rather than as loading. */
const CYCLE_MS = 1100;

const DIM = 0.45;

/**
 * Wraps a set of placeholder blocks and pulses them together.
 *
 * The animation lives here rather than on each block for two reasons: one
 * animated node per card instead of a dozen, and — more visibly — the blocks
 * stay in phase. Per-block animations started at their own mount times drift
 * apart, and a card whose bars breathe out of step reads as several things
 * loading separately rather than as one thing not there yet.
 */
export function SkeletonGroup({ children }: { children: ReactNode }) {
  /**
   * Honours the OS "reduce motion" setting. A loop like this is exactly what
   * that switch is for — it conveys no state, so with it on the blocks simply
   * hold a resting frame.
   */
  const reduced = useReducedMotion();
  const pulse = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;

    pulse.value = withRepeat(
      withTiming(1, { duration: CYCLE_MS, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [reduced, pulse]);

  const style = useAnimatedStyle(() => ({
    opacity: DIM + pulse.value * (1 - DIM),
  }));

  return (
    <Animated.View
      style={style}
      // Nothing in here is real content, and a screen reader walking a stack of
      // empty boxes is worse than silence. The screen announces itself.
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {children}
    </Animated.View>
  );
}

/**
 * A single placeholder bar.
 *
 * `width` takes a percentage as readily as a number, which is what lets a block
 * stand in for a line of text whose real length is unknown — the point is to
 * suggest the shape of the content, not to measure it.
 */
export function SkeletonBlock({
  width,
  height,
  radius = Radius.sm,
  style,
}: {
  width?: DimensionValue;
  height: number;
  radius?: number;
  style?: object;
}) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        { width, height, borderRadius: radius, backgroundColor: colors.skeleton },
        style,
      ]}
    />
  );
}

/** A line of text. Height is the type's line height, not its font size. */
export function SkeletonLine({
  width = "100%",
  height = 12,
}: {
  width?: DimensionValue;
  height?: number;
}) {
  return <SkeletonBlock width={width} height={height} radius={Radius.sm} />;
}

/** The square tile a piece of artwork or a logo will occupy. */
export function SkeletonTile({
  size,
  radius = Radius.md,
}: {
  size: number;
  radius?: number;
}) {
  return <SkeletonBlock width={size} height={size} radius={radius} />;
}
