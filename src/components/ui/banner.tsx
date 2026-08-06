import {
  Alert02Icon,
  CheckmarkCircle02Icon,
  InformationCircleIcon,
} from '@hugeicons/core-free-icons';
import { StyleSheet, View } from 'react-native';

import { Radius, Spacing, type ColorName } from '@/theme';
import { useTheme } from '@/theme';

import { Icon } from './icon';
import { Text } from './text';

export type BannerTone = 'error' | 'success' | 'info';

const TONES: Record<BannerTone, { fg: ColorName; bg: ColorName; icon: typeof Alert02Icon }> = {
  error: { fg: 'danger', bg: 'dangerSoft', icon: Alert02Icon },
  success: { fg: 'success', bg: 'successSoft', icon: CheckmarkCircle02Icon },
  info: { fg: 'primary', bg: 'primarySoft', icon: InformationCircleIcon },
};

export function Banner({ tone = 'error', message }: { tone?: BannerTone; message: string }) {
  const { colors } = useTheme();
  const config = TONES[tone];

  return (
    // `alert` so screen readers announce the message when it appears, rather
    // than only when focus happens to reach it.
    <View
      accessibilityRole="alert"
      style={[styles.banner, { backgroundColor: colors[config.bg] }]}>
      <Icon icon={config.icon} size={20} color={config.fg} />
      <Text variant="footnote" color={config.fg} style={styles.message}>
        {message}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.md,
    borderRadius: Radius.md,
  },
  message: {
    flex: 1,
  },
});
