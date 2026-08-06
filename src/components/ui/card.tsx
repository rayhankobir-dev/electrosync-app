import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { Radius, Spacing, useTheme } from '@/theme';

/**
 * Exported so a child that needs to run to the card's edges — a table's header
 * band and row rules — can cancel it out with a matching negative margin.
 */
export const CardPadding = Spacing.lg;

export function Card({
  children,
  style,
  padded = true,
}: {
  children: ReactNode;
  style?: ViewStyle;
  padded?: boolean;
}) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.borderStrong,
          padding: padded ? CardPadding : 0,
        },
        style,
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    /**
     * Elevation via border rather than shadow: shadows read as grey haze on a
     * dark background, while a border works in both schemes.
     *
     * A full point in `borderStrong`, not a hairline in `border` — a white card
     * on the near-white app background has almost no edge of its own, so the
     * border is the only thing separating them, and at 0.33pt (3× screens) in a
     * colour four values off the background it was not visible at all.
     */
    borderWidth: 1,
    overflow: 'hidden',
  },
});
