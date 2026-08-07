import type { IconSvgElement } from '@hugeicons/react-native';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type ViewStyle,
} from 'react-native';

import { Radius, Spacing, useTheme, type ColorName, type Colors } from '@/theme';

import { Icon } from './icon';
import { Text } from './text';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'md' | 'lg';

export type ButtonProps = Omit<PressableProps, 'style' | 'children'> & {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconSvgElement;
  loading?: boolean;
  fullWidth?: boolean;
  style?: ViewStyle;
};

const HEIGHT: Record<ButtonSize, number> = { md: 44, lg: 52 };

/**
 * Lifted out of `Button` so `IconButton` renders from the same table. The two
 * sit side by side in an action row, where any drift in fill, border or height
 * between them is immediately visible.
 */
function surfaces(
  colors: Colors,
): Record<ButtonVariant, { idle: string; pressed: string; border: string }> {
  return {
    primary: { idle: colors.primary, pressed: colors.primaryPressed, border: 'transparent' },
    secondary: { idle: colors.surface, pressed: colors.surfacePressed, border: colors.border },
    // `border` rather than `surfacePressed` as the pressed fill: a ghost button
    // sits on `background`, not on a card, and `surfacePressed` is only a few
    // percent away from `background` in light mode — the press read as no
    // feedback at all. `border` is a definite step in both schemes.
    ghost: { idle: 'transparent', pressed: colors.border, border: 'transparent' },
    danger: { idle: colors.dangerSoft, pressed: colors.surfacePressed, border: 'transparent' },
  };
}

const LABEL_COLOR: Record<ButtonVariant, ColorName> = {
  primary: 'onPrimary',
  secondary: 'text',
  // Deliberately not `primary`. Ghost is the dismissal sitting under a filled
  // primary button, and tinting it with the accent made "Cancel" look as
  // inviting as "Save" — the accent should mark the action we want taken.
  ghost: 'textSecondary',
  danger: 'danger',
};

export function Button({
  label,
  variant = 'primary',
  size = 'lg',
  icon,
  loading = false,
  fullWidth = true,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const { colors } = useTheme();

  // A loading button stays visually enabled but must not fire twice.
  const isInert = disabled === true || loading;

  const surface = surfaces(colors);
  const labelColor = LABEL_COLOR;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isInert, busy: loading }}
      disabled={isInert}
      style={({ pressed }) => [
        styles.base,
        {
          height: HEIGHT[size],
          backgroundColor: pressed ? surface[variant].pressed : surface[variant].idle,
          borderColor: surface[variant].border,
          alignSelf: fullWidth ? 'stretch' : 'flex-start',
          paddingHorizontal: fullWidth ? Spacing.lg : Spacing.xl,
          opacity: disabled === true ? 0.45 : 1,
        },
        style,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={colors[labelColor[variant]]} />
      ) : (
        <View style={styles.content}>
          {icon ? <Icon icon={icon} size={20} color={labelColor[variant]} /> : null}
          <Text variant="bodyMedium" color={labelColor[variant]}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

/**
 * A square `Button` carrying a glyph instead of a label. Same height, radius and
 * variant surfaces, so it lines up with a labelled button placed beside it in a
 * row.
 *
 * Takes `children` rather than an `icon` prop because the glyph is not always an
 * icon — a filled star, a spinner, a dot — and the caller is what knows the
 * colour it should take.
 */
export function IconButton({
  children,
  accessibilityLabel,
  variant = 'secondary',
  size = 'md',
  disabled,
  style,
  ...rest
}: Omit<PressableProps, 'style' | 'children'> & {
  children: ReactNode;
  accessibilityLabel: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  style?: ViewStyle;
}) {
  const { colors } = useTheme();
  const surface = surfaces(colors);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: disabled === true }}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        {
          height: HEIGHT[size],
          width: HEIGHT[size],
          backgroundColor: pressed ? surface[variant].pressed : surface[variant].idle,
          borderColor: surface[variant].border,
          opacity: disabled === true ? 0.45 : 1,
        },
        style,
      ]}
      {...rest}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
});
