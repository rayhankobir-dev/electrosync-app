import { LockPasswordIcon, Mail01Icon } from "@hugeicons/core-free-icons";
import { Link } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { isApiError } from "@/api/errors";
import { BrandMark } from "@/components/brand-mark";
import { LanguageToggle } from "@/components/language-toggle";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Screen } from "@/components/ui/screen";
import { Text } from "@/components/ui/text";
import { TextField } from "@/components/ui/text-field";
import { useI18n, type TranslationKey } from "@/i18n";
import { isValidEmail } from "@/lib/validation";
import { useSession } from "@/session";
import { Spacing } from "@/theme";

export default function SignInScreen() {
  const { t } = useI18n();
  const { signIn } = useSession();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});
  const [formError, setFormError] = useState<TranslationKey | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    const errors: typeof fieldErrors = {};
    if (!email.trim()) errors.email = t("auth.validation.emailRequired");
    else if (!isValidEmail(email))
      errors.email = t("auth.validation.emailInvalid");
    if (!password) errors.password = t("auth.validation.passwordRequired");

    setFieldErrors(errors);
    setFormError(null);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      await signIn({ email: email.trim(), password });
    } catch (error) {
      console.log(error);
      setFormError(
        isApiError(error)
          ? error.isUnauthorized
            ? "errors.invalidCredentials"
            : error.messageKey
          : "errors.unknown",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen scrollable>
      <View style={styles.topBar}>
        <LanguageToggle />
      </View>

      <View style={styles.header}>
        <BrandMark />
        <View style={styles.headings}>
          <Text variant="title1">{t("auth.signIn.title")}</Text>
          <Text variant="callout" color="textSecondary">
            {t("auth.signIn.subtitle")}
          </Text>
        </View>
      </View>

      <View style={styles.form}>
        {formError ? <Banner message={t(formError)} /> : null}

        <TextField
          label={t("auth.fields.email")}
          required
          leadingIcon={Mail01Icon}
          placeholder={t("auth.fields.emailPlaceholder")}
          value={email}
          onChangeText={setEmail}
          error={fieldErrors.email}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="next"
        />

        <TextField
          label={t("auth.fields.password")}
          required
          leadingIcon={LockPasswordIcon}
          placeholder={t("auth.fields.passwordPlaceholder")}
          value={password}
          onChangeText={setPassword}
          error={fieldErrors.password}
          secureTextEntry
          autoCapitalize="none"
          autoComplete="current-password"
          textContentType="password"
          returnKeyType="go"
          onSubmitEditing={() => void handleSubmit()}
        />

        {/* Directly under the field it relates to, rather than in the footer
            beside the sign-up link — two unrelated escape hatches sitting
            together read as one ambiguous choice. */}
        <Link href="/forgot-password" asChild>
          <Text
            variant="footnote"
            color="primary"
            accessibilityRole="link"
            style={styles.forgot}>
            {t("auth.signIn.forgotPassword")}
          </Text>
        </Link>

        <Button
          label={t("auth.signIn.submit")}
          loading={submitting}
          onPress={() => void handleSubmit()}
          style={styles.submit}
        />
      </View>

      <View style={styles.footer}>
        <Text variant="footnote" color="textSecondary">
          {t("auth.signIn.noAccount")}
        </Text>
        <Link href="/sign-up" asChild>
          <Text variant="footnote" color="primary" accessibilityRole="link">
            {t("auth.signIn.goToSignUp")}
          </Text>
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    alignItems: "flex-end",
  },
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
  forgot: {
    alignSelf: "flex-end",
    // Pulls back against the form's `gap`, so the link reads as belonging to the
    // password field above it rather than floating between two fields.
    marginTop: -Spacing.sm,
  },
  submit: {
    marginTop: Spacing.sm,
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
