import { ArrowRight01Icon } from '@hugeicons/core-free-icons';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { isApiError } from '@/api/errors';
import type { UserProfile } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Card, CardPadding } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { useToast } from '@/components/ui/toast-host';
import { useUpdateProfile } from '@/hooks/use-profile';
import { useI18n, type TranslationKey } from '@/i18n';
import { isValidMobile } from '@/lib/validation';
import { Radius, Spacing, useTheme } from '@/theme';

/**
 * Larger than the 18pt chevron `ListRow` uses. The account card is the one
 * thing on this screen that opens in place rather than navigating, and at 18 in
 * a 44pt-tall header the glyph read as decoration instead of a control.
 */
const CHEVRON_SIZE = 24;

/**
 * Deliberately not a spring. A spring that overshoots height makes the rows
 * below the card bounce with it, and this reveal is a disclosure, not a
 * physical object being flicked.
 */
const TIMING = { duration: 220, easing: Easing.out(Easing.cubic) } as const;

/**
 * The account summary, and the profile form it expands into.
 *
 * The body's height is animated rather than left to lay itself out, because an
 * unanimated mount snaps the card — and every row under it — to its new height
 * in a single frame. Height is the one layout property worth driving here: it
 * runs for 220ms on a tap, and animating the *parent's* height is the only way
 * the content below can slide down with the card instead of jumping.
 */
export function AccountCard({ user }: { user: UserProfile }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const toast = useToast();
  const updateProfile = useUpdateProfile();

  const [expanded, setExpanded] = useState(false);
  /** Kept mounted through the closing animation, then dropped. */
  const [mounted, setMounted] = useState(false);

  const [name, setName] = useState(user.name);
  const [mobile, setMobile] = useState(user.mobile ?? '');
  const [nameError, setNameError] = useState<string | null>(null);
  const [mobileError, setMobileError] = useState<string | null>(null);
  const [formError, setFormError] = useState<TranslationKey | null>(null);

  /**
   * The body's natural height, from the last time it measured itself. State
   * rather than a ref: the animation below is driven from an effect, and a ref
   * mutation would not wake it.
   */
  const [bodyHeight, setBodyHeight] = useState(0);

  const height = useSharedValue(0);
  const rotation = useSharedValue(0);

  useEffect(() => {
    rotation.value = withTiming(expanded ? 90 : 0, TIMING);
  }, [expanded, rotation]);

  useEffect(() => {
    if (expanded) {
      // Zero on the very first expand — nothing has measured yet. The layout
      // pass after the mount reports the real height and re-runs this.
      height.value = withTiming(bodyHeight, TIMING);
      return;
    }

    height.value = withTiming(0, TIMING, (finished) => {
      // Unmounting any earlier would blank the form mid-collapse.
      if (finished) runOnJS(setMounted)(false);
    });
  }, [bodyHeight, expanded, height]);

  const bodyStyle = useAnimatedStyle(() => ({ height: height.value }));
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const trimmedName = name.trim();
  const trimmedMobile = mobile.trim();
  const storedMobile = user.mobile ?? '';
  const changed = trimmedName !== user.name || trimmedMobile !== storedMobile;

  function handleBodyLayout(event: LayoutChangeEvent) {
    // Only records the measurement — the effect above animates to it. That also
    // covers the body growing while already open: a validation message
    // appearing under a field has to push the card open a little further.
    setBodyHeight(event.nativeEvent.layout.height);
  }

  function toggle() {
    if (expanded) {
      setExpanded(false);
      return;
    }

    // Re-seeded on the way in rather than on the way out, so an abandoned edit
    // is never what greets the user next time.
    setName(user.name);
    setMobile(storedMobile);
    setNameError(null);
    setMobileError(null);
    setFormError(null);

    setMounted(true);
    setExpanded(true);
  }

  async function handleSave() {
    setFormError(null);

    if (!trimmedName) {
      setNameError(t('auth.validation.nameRequired'));
      return;
    }
    setNameError(null);

    // Empty is not invalid: it is how the number gets cleared.
    if (trimmedMobile && !isValidMobile(trimmedMobile)) {
      setMobileError(t('auth.validation.mobileInvalid'));
      return;
    }
    setMobileError(null);

    try {
      // Only the changed fields. An omitted key is one the server leaves as it
      // is, so sending both would rewrite a column the user never touched.
      await updateProfile.mutateAsync({
        ...(trimmedName !== user.name ? { name: trimmedName } : {}),
        ...(trimmedMobile !== storedMobile ? { mobile: trimmedMobile } : {}),
      });

      /**
       * Collapsing is part of the confirmation, not a separate flourish. The
       * success message used to sit inside this panel, right beside the Save
       * button the user was already looking at; a toast appears at the top of the
       * screen instead, which an expanded form can push well out of view. The
       * panel closing is the feedback that lands where the eye already is, and
       * the toast names what happened.
       */
      setExpanded(false);
      toast.success(t("settings.profileSaved"));
    } catch (error) {
      setFormError(isApiError(error) ? error.messageKey : 'errors.unknown');
    }
  }

  const initial = Array.from(user.name.trim())[0]?.toUpperCase() ?? '?';

  return (
    // Layout-neutral: the screen owns the spacing around it, like every other
    // block on the settings screen.
    <Card padded={false}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityHint={t('settings.editProfile')}
        onPress={toggle}
        style={({ pressed }) => [
          styles.header,
          { backgroundColor: pressed ? colors.surfacePressed : 'transparent' },
        ]}>
        <View style={[styles.monogram, { backgroundColor: colors.primary }]}>
          <Text variant="title3" color="textInverse">
            {initial}
          </Text>
        </View>

        <View style={styles.meta}>
          <Text variant="bodyMedium" numberOfLines={1}>
            {user.name}
          </Text>
          <Text variant="footnote" color="textTertiary" numberOfLines={1}>
            {user.email}
          </Text>
        </View>

        {/* Rotated rather than swapped for a down-chevron: turning the same
            glyph tells the user which control closed the panel again. */}
        <Animated.View style={chevronStyle}>
          <Icon
            icon={ArrowRight01Icon}
            size={CHEVRON_SIZE}
            strokeWidth={2}
            color="textSecondary"
          />
        </Animated.View>
      </Pressable>

      <Animated.View style={[styles.clip, bodyStyle]}>
        {mounted ? (
          <View onLayout={handleBodyLayout} style={styles.body}>
            <View style={[styles.divider, { borderBottomColor: colors.border }]} />

            <TextField
              label={t('auth.fields.name')}
              required
              placeholder={t('auth.fields.namePlaceholder')}
              value={name}
              onChangeText={setName}
              error={nameError}
              autoCapitalize="words"
              maxLength={255}
            />

            {/* Shown, not offered. A disabled input still looks like something
                the user ought to be able to fix, so the email is presented as
                the fact it is — with the reason it cannot be edited. */}
            <View style={styles.readOnly}>
              <Text variant="subhead" color="textSecondary">
                {t('auth.fields.email')}
              </Text>
              <View style={styles.emailRow}>
                <Text variant="body" numberOfLines={1} style={styles.emailValue}>
                  {user.email}
                </Text>
                {user.emailVerified ? (
                  <Badge label={t('settings.verified')} tone="success" />
                ) : null}
              </View>
              <Text variant="footnote" color="textTertiary">
                {t('settings.emailFixed')}
              </Text>
            </View>

            <TextField
              label={t('auth.fields.mobile')}
              placeholder={t('auth.fields.mobilePlaceholder')}
              value={mobile}
              onChangeText={setMobile}
              error={mobileError}
              keyboardType="phone-pad"
              maxLength={32}
            />

            {/* Errors stay inline. A validation failure belongs next to the
                fields it is about and has to persist while they are corrected —
                which is exactly what a toast cannot do. */}
            {formError ? <Banner message={t(formError)} /> : null}

            {/* Side by side, not stacked: two full-width blocks inside a card
                turn a short form into a wall of buttons. */}
            <View style={styles.actions}>
              <Button
                label={t('common.cancel')}
                variant="secondary"
                size="md"
                onPress={() => setExpanded(false)}
                style={styles.action}
              />
              <Button
                label={t('common.save')}
                size="md"
                loading={updateProfile.isPending}
                // Nothing edited means nothing to send, and a Save that fires a
                // no-op PATCH teaches the user it does nothing.
                disabled={!changed}
                onPress={() => void handleSave()}
                style={styles.action}
              />
            </View>
          </View>
        ) : null}
      </Animated.View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    padding: CardPadding,
  },
  monogram: {
    width: 44,
    height: 44,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  meta: {
    flex: 1,
    gap: 2,
  },
  /**
   * The animated box. `overflow: hidden` is what makes a height of zero read as
   * closed rather than as a form spilling out of a card of no height.
   */
  clip: {
    overflow: 'hidden',
  },
  body: {
    gap: Spacing.lg,
    paddingHorizontal: CardPadding,
    paddingBottom: CardPadding,
  },
  /** Meets the card's edges, like the rules `ListGroup` draws between rows. */
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginHorizontal: -CardPadding,
  },
  readOnly: {
    gap: Spacing.xs,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  emailValue: {
    flexShrink: 1,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  action: {
    flex: 1,
  },
});
