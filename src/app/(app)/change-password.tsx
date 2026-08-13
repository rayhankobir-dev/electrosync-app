import { LockPasswordIcon } from "@hugeicons/core-free-icons";
import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { isApiError } from "@/api/errors";
import { ScreenHeader } from "@/components/screen-header";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Screen } from "@/components/ui/screen";
import { Text } from "@/components/ui/text";
import { TextField } from "@/components/ui/text-field";
import { useToast } from "@/components/ui/toast-host";
import { useI18n, type TranslationKey } from "@/i18n";
import { MIN_PASSWORD_LENGTH } from "@/lib/validation";
import { useSession } from "@/session";
import { Spacing } from "@/theme";

type FieldErrors = {
  current?: string;
  password?: string;
  confirm?: string;
};

/**
 * Changing a known password, for a signed-in user. The forgotten-password pair
 * of screens lives in `(auth)` and is unreachable from here — that group is
 * mounted behind a `!isAuthenticated` guard — which is why the hint at the
 * bottom describes the route out rather than linking to it.
 */
export default function ChangePasswordScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { api } = useSession();
  const toast = useToast();

  const [current, setCurrent] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<TranslationKey | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function validate(): FieldErrors {
    const errors: FieldErrors = {};

    if (!current) errors.current = t("auth.validation.currentPasswordRequired");

    if (!password) errors.password = t("auth.validation.passwordRequired");
    else if (password.length < MIN_PASSWORD_LENGTH)
      errors.password = t("auth.validation.passwordTooShort");
    /**
     * Checked here as well as on the server, and this is the check that makes
     * the error mapping below honest: the server answers both "wrong current
     * password" and "that is the password you already have" with a 400, and the
     * screen has no way to tell them apart. Catching the second case locally
     * leaves only the first reachable.
     */
    else if (password === current)
      errors.password = t("auth.validation.passwordUnchanged");

    if (!confirm) errors.confirm = t("auth.validation.confirmRequired");
    else if (confirm !== password)
      errors.confirm = t("auth.validation.passwordMismatch");

    return errors;
  }

  async function handleSubmit() {
    const errors = validate();

    setFieldErrors(errors);
    setFormError(null);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      await api.auth.changePassword({
        currentPassword: current,
        newPassword: password,
      });

      /**
       * Back to settings, then the toast — the same shape the profile form uses.
       * The screen closing is the feedback that lands where the eye already is,
       * and the toast names what happened.
       *
       * No session work on the way out: the response carries no token, and the
       * one this request went out with is still valid.
       */
      router.back();
      toast.success(t("auth.changePassword.success"));
    } catch (error) {
      setFormError(
        isApiError(error)
          ? // 400 is the wrong current password. The server uses it rather than
            // 401 precisely so a typo does not reach the client's
            // session-clearing 401 handler and sign the user out mid-form.
            error.status === 400
            ? "errors.invalidCurrentPassword"
            : error.messageKey
          : "errors.unknown",
      );
    } finally {
      setSubmitting(false);
    }
  }

  /** Clears a field's error as it is corrected, rather than on the next submit. */
  function edit(
    field: keyof FieldErrors,
    set: (value: string) => void,
  ): (value: string) => void {
    return (value) => {
      set(value);
      if (fieldErrors[field]) {
        setFieldErrors((errors) => ({ ...errors, [field]: undefined }));
      }
    };
  }

  return (
    // `edgeToEdgeBottom={false}` because the tab bar already covers the inset —
    // this route is inside the tab navigator, just hidden from the bar itself.
    <Screen
      scrollable
      edgeToEdgeBottom={false}
      header={
        <ScreenHeader
          title={t("auth.changePassword.title")}
          // The bell would offer to leave a form mid-edit, and this screen is
          // not somewhere an alert needs to be answered from.
          bell={false}
        />
      }
    >
      <Text variant="callout" color="textSecondary" style={styles.subtitle}>
        {t("auth.changePassword.subtitle")}
      </Text>

      <View style={styles.form}>
        {formError ? <Banner message={t(formError)} /> : null}

        <TextField
          label={t("auth.changePassword.currentPassword")}
          required
          leadingIcon={LockPasswordIcon}
          placeholder={t("auth.changePassword.currentPlaceholder")}
          value={current}
          onChangeText={edit("current", setCurrent)}
          error={fieldErrors.current}
          secureTextEntry
          autoCapitalize="none"
          // `password`, not `new-password`: this is the one field where the
          // keychain has something to offer.
          autoComplete="password"
          textContentType="password"
          autoFocus
          returnKeyType="next"
        />

        <TextField
          label={t("auth.changePassword.newPassword")}
          required
          leadingIcon={LockPasswordIcon}
          placeholder={t("auth.fields.passwordPlaceholder")}
          value={password}
          onChangeText={edit("password", setPassword)}
          error={fieldErrors.password}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="next"
        />

        <TextField
          label={t("auth.changePassword.confirmPassword")}
          required
          leadingIcon={LockPasswordIcon}
          placeholder={t("auth.changePassword.confirmPlaceholder")}
          value={confirm}
          onChangeText={edit("confirm", setConfirm)}
          error={fieldErrors.confirm}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="new-password"
          textContentType="newPassword"
          returnKeyType="go"
          onSubmitEditing={() => void handleSubmit()}
        />

        <Button
          label={t("auth.changePassword.submit")}
          loading={submitting}
          onPress={() => void handleSubmit()}
          style={styles.submit}
        />
      </View>

      <View style={styles.notes}>
        {/* Said here rather than left to be discovered: a user who changes a
            password after losing a phone will reasonably assume it evicted that
            phone, and it does not — there is no session table to revoke
            against. */}
        <Text variant="footnote" color="textTertiary">
          {t("auth.changePassword.signedInNote")}
        </Text>
        <Text variant="footnote" color="textTertiary">
          {t("auth.changePassword.forgot")}
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  subtitle: {
    marginBottom: Spacing.xl,
  },
  form: {
    gap: Spacing.lg,
  },
  submit: {
    marginTop: Spacing.sm,
  },
  notes: {
    gap: Spacing.sm,
    marginTop: Spacing.xl,
  },
});
