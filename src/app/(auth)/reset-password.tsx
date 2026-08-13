import { LockPasswordIcon, SecurityPasswordIcon } from "@hugeicons/core-free-icons";
import { Link, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { isApiError } from "@/api/errors";
import { BrandMark } from "@/components/brand-mark";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Screen } from "@/components/ui/screen";
import { Text } from "@/components/ui/text";
import { TextField } from "@/components/ui/text-field";
import { useToast } from "@/components/ui/toast-host";
import { useI18n, type TranslationKey } from "@/i18n";
import {
  MIN_PASSWORD_LENGTH,
  RESET_CODE_LENGTH,
  isValidResetCode,
  toLatinDigits,
} from "@/lib/validation";
import { useSession } from "@/session";
import { HitSlop, Spacing, type ColorName } from "@/theme";

/**
 * Mirrors `RESEND_COOLDOWN_SECONDS` in the backend's `password-reset.policy.ts`.
 * Duplicated rather than fetched: the server enforces the real limit and answers
 * 429 regardless, so this only exists to stop the user spending a tap
 * discovering that.
 */
const RESEND_COOLDOWN_SECONDS = 60;

type FieldErrors = {
  code?: string;
  password?: string;
  confirm?: string;
};

export default function ResetPasswordScreen() {
  const { t } = useI18n();
  const { api, resetPassword } = useSession();
  const toast = useToast();

  // Handed over by the forgot-password screen. A route param arrives as
  // `string | string[]`, so narrow before using it.
  const params = useLocalSearchParams<{ email?: string | string[] }>();
  const email = (Array.isArray(params.email) ? params.email[0] : params.email) ?? "";

  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<TranslationKey | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  // Starts counting immediately: arriving here *is* a code having just been
  // sent, so the cooldown is already running on the server.
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);

  useEffect(() => {
    if (cooldown <= 0) return;

    // A chained timeout rather than one interval, so each tick is scheduled from
    // the last render and the cleanup cannot leave a stray interval behind. It
    // drifts a little past a second per tick, which errs on the safe side —
    // enabling resend slightly *after* the server would accept it, never before.
    const timer = setTimeout(() => setCooldown((current) => current - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  function validate(normalizedCode: string): FieldErrors {
    const errors: FieldErrors = {};

    if (!normalizedCode) errors.code = t("auth.validation.codeRequired");
    else if (!isValidResetCode(normalizedCode))
      errors.code = t("auth.validation.codeInvalid");

    if (!password) errors.password = t("auth.validation.passwordRequired");
    else if (password.length < MIN_PASSWORD_LENGTH)
      errors.password = t("auth.validation.passwordTooShort");

    if (!confirm) errors.confirm = t("auth.validation.confirmRequired");
    else if (confirm !== password)
      errors.confirm = t("auth.validation.passwordMismatch");

    return errors;
  }

  async function handleSubmit() {
    const normalizedCode = toLatinDigits(code).trim();
    const errors = validate(normalizedCode);

    setFieldErrors(errors);
    setFormError(null);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      await resetPassword({ email, code: normalizedCode, password });

      /**
       * No navigation here. Persisting the token flips `isAuthenticated`, and the
       * root layout's `Stack.Protected` guard swaps the whole group to `(app)` —
       * the same path `signIn` takes. Pushing a route as well would race that.
       */
      toast.success(t("auth.resetPassword.success"));
    } catch (error) {
      setFormError(
        isApiError(error)
          ? // 400 here means the code was wrong, expired, already used, or out
            // of attempts — the server reports them identically on purpose, so
            // one message covers all four.
            error.status === 400
            ? "errors.invalidResetCode"
            : error.messageKey
          : "errors.unknown",
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResend() {
    setFormError(null);
    setResending(true);

    try {
      await api.auth.forgotPassword({ email });

      // The old code is dead on the server, so clearing the field keeps the
      // screen honest about what is now typed there.
      setCode("");
      setFieldErrors((current) => ({ ...current, code: undefined }));
      setCooldown(RESEND_COOLDOWN_SECONDS);
      toast.info(t("auth.resetPassword.resent"));
    } catch (error) {
      setFormError(isApiError(error) ? error.messageKey : "errors.unknown");
      // Deliberately not restarting the cooldown on failure — a 429 means the
      // server is still counting, and hiding the button would leave the user
      // unable to retry once it clears.
    } finally {
      setResending(false);
    }
  }

  const resendDisabled = cooldown > 0 || resending || submitting;

  return (
    <Screen scrollable>
      <View style={styles.header}>
        <BrandMark />
        <View style={styles.headings}>
          <Text variant="title1">{t("auth.resetPassword.title")}</Text>
          <Text variant="callout" color="textSecondary">
            {t("auth.resetPassword.subtitle", { email })}
          </Text>
        </View>
      </View>

      <View style={styles.form}>
        {formError ? <Banner message={t(formError)} /> : null}

        <TextField
          label={t("auth.resetPassword.code")}
          required
          leadingIcon={SecurityPasswordIcon}
          placeholder={t("auth.resetPassword.codePlaceholder")}
          value={code}
          onChangeText={setCode}
          error={fieldErrors.code}
          numeric
          keyboardType="number-pad"
          // `oneTimeCode` lets iOS offer the code from the notification banner,
          // saving the user a trip to their mail app.
          textContentType="oneTimeCode"
          autoComplete="one-time-code"
          maxLength={RESET_CODE_LENGTH}
          autoFocus
          returnKeyType="next"
        />

        <TextField
          label={t("auth.resetPassword.newPassword")}
          required
          leadingIcon={LockPasswordIcon}
          placeholder={t("auth.fields.passwordPlaceholder")}
          value={password}
          onChangeText={setPassword}
          error={fieldErrors.password}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="next"
        />

        <TextField
          label={t("auth.resetPassword.confirmPassword")}
          required
          leadingIcon={LockPasswordIcon}
          placeholder={t("auth.resetPassword.confirmPlaceholder")}
          value={confirm}
          onChangeText={setConfirm}
          error={fieldErrors.confirm}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={() => void handleSubmit()}
        />

        <Button
          label={t("auth.resetPassword.submit")}
          loading={submitting}
          onPress={() => void handleSubmit()}
          style={styles.submit}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: resendDisabled }}
          disabled={resendDisabled}
          hitSlop={HitSlop / 2}
          onPress={() => void handleResend()}
          style={styles.resend}
        >
          {cooldown > 0 ? (
            <ResendCountdown
              seconds={cooldown}
              color={resendDisabled ? "textTertiary" : "primary"}
            />
          ) : (
            <Text
              variant="footnote"
              color={resendDisabled ? "textTertiary" : "primary"}
            >
              {t("auth.resetPassword.resend")}
            </Text>
          )}
        </Pressable>
      </View>

      <View style={styles.footer}>
        <Link href="/sign-in" asChild>
          <Text variant="footnote" color="primary" accessibilityRole="link">
            {t("auth.forgotPassword.backToSignIn")}
          </Text>
        </Link>
      </View>
    </Screen>
  );
}

/**
 * Placeholder standing in for the seconds while the sentence is interpolated, so
 * the two halves either side of the figure can be recovered.
 *
 * A private-use codepoint, written as an escape rather than pasted in: nothing
 * in a translation bundle can contain it, which makes the split unambiguous,
 * and keeping it out of the file as a literal stops editors and diff tools from
 * treating the source as binary.
 */
const SECONDS_SLOT = "\uE000";

/**
 * The resend countdown, with the numeral family on the seconds only.
 *
 * The line is one translated sentence — "{{seconds}} সেকেন্ড পরে আবার পাঠান" —
 * so marking the outer `Text` numeric would set the Bangla words in it too.
 * Splitting the interpolated string lets the figure alone change family while
 * the copy around it stays in the interface font, which is how every other
 * number-inside-a-sentence on the screen already reads.
 *
 * Both `Text`s are `footnote` in the same locale, so they resolve to an
 * identical line height and the nested run cannot shift the baseline.
 */
function ResendCountdown({
  seconds,
  color,
}: {
  seconds: number;
  color: ColorName;
}) {
  const { t, formatNumber } = useI18n();

  // A template missing the placeholder yields a single segment, leaving `after`
  // undefined — which renders as nothing rather than throwing.
  const [before, after] = t("auth.resetPassword.resendIn", {
    seconds: SECONDS_SLOT,
  }).split(SECONDS_SLOT);

  return (
    <Text variant="footnote" color={color}>
      {before}
      <Text variant="footnote" color={color} numeric>
        {formatNumber(seconds, 0)}
      </Text>
      {after}
    </Text>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Spacing.lg,
    marginTop: Spacing["2xl"],
    marginBottom: Spacing["2xl"],
  },
  headings: {
    gap: Spacing.xs,
  },
  form: {
    gap: Spacing.lg,
  },
  submit: {
    marginTop: Spacing.sm,
  },
  resend: {
    alignSelf: "center",
    paddingVertical: Spacing.xs,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: "auto",
    paddingTop: Spacing.xl,
  },
});
