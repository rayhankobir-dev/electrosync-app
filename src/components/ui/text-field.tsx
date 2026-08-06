import { ViewIcon, ViewOffSlashIcon } from '@hugeicons/core-free-icons';
import { useState } from 'react';
import {
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputProps,
} from 'react-native';

import { useI18n } from '@/i18n';
import { fontFamily, HitSlop, Radius, Spacing, TypeScale, useTheme } from '@/theme';

import { Icon } from './icon';
import { Text } from './text';

export type TextFieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  /** Rendered under the field and turns the border red. */
  error?: string | null;
  hint?: string;
  /**
   * Marks the label with a red asterisk. Optional fields say nothing at all —
   * the marker only earns its place if it is the exception, and labelling both
   * cases means the user has to read every one to find the few that matter.
   */
  required?: boolean;
};

export function TextField({
  label,
  error,
  hint,
  required = false,
  secureTextEntry,
  onFocus,
  onBlur,
  ...rest
}: TextFieldProps) {
  const { colors } = useTheme();
  const { locale } = useI18n();
  const [focused, setFocused] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const isPassword = secureTextEntry === true;

  // Error outranks focus: a red border that turns blue on focus would hide the
  // very state the user needs to fix.
  const borderColor = error ? colors.danger : focused ? colors.primary : colors.border;

  return (
    <View style={styles.wrapper}>
      <Text variant="subhead" color="textSecondary">
        {label}
        {/* Nested rather than a sibling in a flex row: as inline text the
            asterisk stays glued to the last word, so a label that wraps takes
            the marker with it instead of leaving it stranded on its own line. */}
        {required ? (
          <Text variant="subhead" color="danger">
            {' *'}
          </Text>
        ) : null}
      </Text>

      <View
        style={[
          styles.field,
          { backgroundColor: colors.surface, borderColor },
          focused && !error ? { borderWidth: 1.5 } : null,
        ]}>
        <TextInput
          style={[
            styles.input,
            {
              color: colors.text,
              fontFamily: fontFamily(locale, TypeScale.body.weight),
              fontSize: TypeScale.body.size,
            },
          ]}
          placeholderTextColor={colors.textTertiary}
          secureTextEntry={isPassword && !revealed}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          {...rest}
        />

        {isPassword ? (
          <Pressable
            accessibilityRole="button"
            hitSlop={HitSlop / 4}
            onPress={() => setRevealed((current) => !current)}
            style={styles.reveal}>
            <Icon icon={revealed ? ViewOffSlashIcon : ViewIcon} size={20} color="textTertiary" />
          </Pressable>
        ) : null}
      </View>

      {error ? (
        <Text variant="footnote" color="danger">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="footnote" color="textTertiary">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: Spacing.xs,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 52,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.lg,
  },
  input: {
    flex: 1,
    paddingVertical: Spacing.md,
  },
  reveal: {
    paddingLeft: Spacing.sm,
  },
});
