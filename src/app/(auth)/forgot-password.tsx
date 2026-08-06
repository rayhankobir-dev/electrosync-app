import { Link, router } from "expo-router";
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
import { useToast } from "@/components/ui/toast-host";
import { useI18n, type TranslationKey } from "@/i18n";
import { isValidEmail } from "@/lib/validation";
import { useSession } from "@/session";
import { Spacing } from "@/theme";

export default function ForgotPasswordScreen() {
  const { t } = useI18n();
  const { api } = useSession();
  const toast = useToast();

  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState<string | undefined>();
  const [formError, setFormError] = useState<TranslationKey | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    const trimmed = email.trim();

    setFormError(null);

    if (!trimmed) {
      setEmailError(t("auth.validation.emailRequired"));
      return;
    }
    if (!isValidEmail(trimmed)) {
      setEmailError(t("auth.validation.emailInvalid"));
      return;
    }

    setEmailError(undefined);
    setSubmitting(true);

    try {
      await api.auth.forgotPassword({ email: trimmed });

      /**
       * Straight on to the code screen, carrying the email so the next step can
       * name it and resend without asking again.
       *
       * `replace`, not `push`: coming *back* here would offer to send a second
       * code, which the server's one-per-minute cooldown would refuse. The way
       * back to a fresh request is the sign-in screen, which the next screen
       * links to.
       */
      router.replace({
        pathname: "/reset-password",
        params: { email: trimmed },
      });

      /**
       * Hedged wording, because the server deliberately answers the same way for
       * a registered and an unregistered email — so this screen genuinely does
       * not know which happened, and promising "we sent it" would be a guess.
       */
      toast.info(t("auth.forgotPassword.sent"));
    } catch (error) {
      setFormError(isApiError(error) ? error.messageKey : "errors.unknown");
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
          <Text variant="title1">{t("auth.forgotPassword.title")}</Text>
          <Text variant="callout" color="textSecondary">
            {t("auth.forgotPassword.subtitle")}
          </Text>
        </View>
      </View>

      <View style={styles.form}>
        {formError ? <Banner message={t(formError)} /> : null}

        <TextField
          label={t("auth.fields.email")}
          required
          placeholder={t("auth.fields.emailPlaceholder")}
          value={email}
          onChangeText={setEmail}
          error={emailError}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
          returnKeyType="go"
          autoFocus
          onSubmitEditing={() => void handleSubmit()}
        />

        <Button
          label={t("auth.forgotPassword.submit")}
          loading={submitting}
          onPress={() => void handleSubmit()}
          style={styles.submit}
        />
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
