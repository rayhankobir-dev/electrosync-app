import { Pressable, StyleSheet, View } from 'react-native';

import { Radius, Spacing, useTheme } from '@/theme';

import { Text } from './text';

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
  /**
   * Marks this segment's label as a figure rather than a word, which under `bn`
   * sets it in the Bangla numeral family. Per option rather than per control on
   * purpose: a threshold picker reads `৳৫০ | ৳১০০ | ৳২০০ | ৳৫০০ | অন্য`, so a
   * flag on the track would drag that trailing word into the numeral font too.
   */
  numeric?: boolean;
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly SegmentedOption<T>[];
  value: T;
  onChange(next: T): void;
}) {
  const { colors } = useTheme();

  return (
    <View
      accessibilityRole="radiogroup"
      style={[styles.track, { backgroundColor: colors.background, borderColor: colors.border }]}>
      {options.map((option) => {
        const selected = option.value === value;

        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={[
              styles.segment,
              selected
                ? { backgroundColor: colors.surface, borderColor: colors.borderStrong }
                : { borderColor: 'transparent' },
            ]}>
            <Text
              variant="subhead"
              color={selected ? 'text' : 'textTertiary'}
              align="center"
              numeric={option.numeric}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 3,
    gap: 3,
  },
  segment: {
    flex: 1,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.xs,
    borderRadius: Radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
