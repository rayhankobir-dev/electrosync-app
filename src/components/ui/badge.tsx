import { StyleSheet, View } from 'react-native';

import { Radius, Spacing, useTheme, type ColorName } from '@/theme';

import { Text } from './text';

export type BadgeTone = 'neutral' | 'primary' | 'success' | 'warning';

const TONES: Record<BadgeTone, { fg: ColorName; bg: ColorName }> = {
  neutral: { fg: 'textSecondary', bg: 'surfacePressed' },
  primary: { fg: 'primary', bg: 'primarySoft' },
  success: { fg: 'success', bg: 'successSoft' },
  warning: { fg: 'warning', bg: 'warningSoft' },
};

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: BadgeTone }) {
  const { colors } = useTheme();
  const config = TONES[tone];

  return (
    <View style={[styles.badge, { backgroundColor: colors[config.bg] }]}>
      <Text variant="caption" color={config.fg}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
});
