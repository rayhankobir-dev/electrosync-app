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

export function Badge({
  label,
  tone = 'neutral',
  align = 'start',
}: {
  label: string;
  tone?: BadgeTone;
  /**
   * Where the pill sits on its parent's cross axis. It has to be declared here
   * rather than left to the parent's `alignItems`, because `alignSelf` always
   * wins over it — and the pill needs one: inside a row it would otherwise
   * stretch to the row's full height and stop reading as a pill.
   *
   * `start` suits the rows this sits in most often; `center` is for a container
   * that centres its content, such as a centred table column.
   */
  align?: 'start' | 'center';
}) {
  const { colors } = useTheme();
  const config = TONES[tone];

  return (
    <View
      style={[
        styles.badge,
        {
          alignSelf: align === 'center' ? 'center' : 'flex-start',
          backgroundColor: colors[config.bg],
        },
      ]}
    >
      <Text variant="caption" color={config.fg}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
});
