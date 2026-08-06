import type { IconSvgElement } from '@hugeicons/react-native';
import { useState } from 'react';
import {
  Animated,
  Platform,
  Pressable,
  StyleSheet,
  type PressableProps,
  type ViewStyle,
} from 'react-native';

import { Radius, useTheme } from '@/theme';

import { Icon } from './icon';

/** Diameter of the coloured disc, ring excluded. */
export const FabSize = 58;

/**
 * Width of the ring painted in the screen background colour. It reads as the
 * tab bar being cut away behind the button — cheaper and sturdier than drawing
 * a notched SVG path, which would have to be re-measured on every rotation.
 */
export const FabRing = 5;

/** Full footprint. Callers reserving space for the button need this, not `FabSize`. */
export const FabDiameter = FabSize + FabRing * 2;

export type FabProps = Omit<PressableProps, 'style' | 'children'> & {
  icon: IconSvgElement;
  /** Spoken label. The button carries no visible text. */
  label: string;
  style?: ViewStyle;
};

/**
 * Circular floating action button. The only element in the app that casts a
 * shadow: `tokens.ts` expresses elevation with borders because grey shadows
 * turn to mud in dark mode, but this one is tinted with `primary`, so it reads
 * as the button's own glow in both schemes rather than as dirt under it.
 */
export function Fab({ icon, label, style, onPressIn, onPressOut, ...rest }: FabProps) {
  const { colors } = useTheme();
  // A lazy state initialiser rather than `useRef(...).current`: the React
  // Compiler lint forbids reading a ref during render, and this value has to be
  // created exactly once or every re-render would restart the spring.
  const [scale] = useState(() => new Animated.Value(1));

  function springTo(value: number) {
    Animated.spring(scale, {
      toValue: value,
      speed: 40,
      bounciness: 6,
      // Web has no native driver to hand off to; asking for one only warns.
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }

  const glow = Platform.select({
    // Android draws elevation from the view's own outline, so it has to sit on
    // the filled disc rather than on the animated wrapper.
    android: { elevation: 16 },
    default: {
      shadowColor: colors.primary,
      /**
       * Strong on purpose. At 0.35 with a 14pt spread, a primary-tinted shadow
       * on a near-white background was too close to the background to read as
       * depth at all — the disc looked pasted on. Pushing the offset down and
       * the opacity up is what makes it sit *above* the bar.
       */
      shadowOpacity: 0.45,
      shadowOffset: { width: 0, height: 10 },
      shadowRadius: 18,
    },
  });

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPressIn={(event) => {
          springTo(0.92);
          onPressIn?.(event);
        }}
        onPressOut={(event) => {
          springTo(1);
          onPressOut?.(event);
        }}
        style={({ pressed }) => [
          styles.disc,
          glow,
          {
            backgroundColor: pressed ? colors.primaryPressed : colors.primary,
            borderColor: colors.background,
          },
        ]}
        {...rest}>
        <Icon icon={icon} size={26} strokeWidth={2.2} color="onPrimary" />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  disc: {
    width: FabDiameter,
    height: FabDiameter,
    borderRadius: Radius.full,
    borderWidth: FabRing,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
