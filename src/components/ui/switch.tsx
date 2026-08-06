import { Switch as RNSwitch, type SwitchProps } from 'react-native';

import { useTheme } from '@/theme';

/**
 * The platform switch, wearing the app's colours.
 *
 * `ios_backgroundColor` is not a duplicate of `trackColor.false`: iOS animates
 * the off track by revealing the view behind the switch, so without it the
 * track flashes the platform default grey mid-toggle.
 */
export function Switch(props: Omit<SwitchProps, 'trackColor' | 'thumbColor' | 'ios_backgroundColor'>) {
  const { colors } = useTheme();

  return (
    <RNSwitch
      trackColor={{ false: colors.borderStrong, true: colors.primary }}
      // Constant, not scheme-dependent: the thumb has to stay visible against
      // the primary fill as well as the grey one.
      thumbColor={colors.surfaceRaised}
      ios_backgroundColor={colors.borderStrong}
      {...props}
    />
  );
}
