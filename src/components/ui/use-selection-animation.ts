import { useEffect } from "react";
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { Pressable } from "react-native";

import { useTheme } from "@/theme";

export const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/**
 * Spring rather than a linear tween: selection is a direct response to a tap,
 * and a little overshoot reads as physical. Tuned to settle quickly — this
 * fires on every switch, so anything bouncier becomes tiring.
 */
const SELECT_SPRING = { damping: 15, stiffness: 220, mass: 0.5 } as const;

/**
 * Animated styles for a selectable card and its check badge.
 *
 * Shared as a hook rather than a component so the provider and meter-type
 * pickers keep their own independent markup — only the motion is common.
 *
 * Note what is *not* animated: `borderWidth`. Border width affects layout, so
 * driving it per-frame forces a layout pass on every frame and janks. The
 * border stays a constant 2px and only its colour moves, which looks identical
 * and costs nothing.
 */
export function useSelectionAnimation(selected: boolean) {
  const { colors } = useTheme();

  const progress = useSharedValue(selected ? 1 : 0);
  const pressed = useSharedValue(0);

  useEffect(() => {
    progress.value = withSpring(selected ? 1 : 0, SELECT_SPRING);
  }, [selected, progress]);

  const cardStyle = useAnimatedStyle(() => ({
    // Selection lifts the card slightly; a press pushes it back down. Both act
    // on the same scale so a tap on an already-selected card still responds.
    transform: [
      { scale: interpolate(progress.value, [0, 1], [1, 1.03]) - pressed.value * 0.05 },
    ],
    borderColor: interpolateColor(
      progress.value,
      [0, 1],
      [colors.border, colors.primary],
    ),
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [colors.surface, colors.primarySoft],
    ),
  }));

  /** Pops in from nothing, and slightly past full size on the way. */
  const checkStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { scale: interpolate(progress.value, [0, 0.7, 1], [0.4, 1.12, 1]) },
    ],
  }));

  const onPressIn = () => {
    pressed.value = withTiming(1, { duration: 90 });
  };

  const onPressOut = () => {
    pressed.value = withTiming(0, { duration: 160 });
  };

  return { cardStyle, checkStyle, onPressIn, onPressOut, progress };
}

export type SelectionProgress = SharedValue<number>;
