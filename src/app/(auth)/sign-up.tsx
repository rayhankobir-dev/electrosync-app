import {
  ArrowLeft01Icon,
  LockPasswordIcon,
  Mail01Icon,
  SmartPhone01Icon,
  UserIcon,
} from "@hugeicons/core-free-icons";
import { Link, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { isApiError } from "@/api/errors";
import { BrandMark } from "@/components/brand-mark";
import { LanguageToggle } from "@/components/language-toggle";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Screen } from "@/components/ui/screen";
import { Text } from "@/components/ui/text";
import { TextField } from "@/components/ui/text-field";
import { useI18n, type TranslationKey } from "@/i18n";
import { isValidEmail, MIN_PASSWORD_LENGTH } from "@/lib/validation";
import { useSession } from "@/session";
import { HitSlop, Spacing } from "@/theme";

type FieldErrors = { name?: string; email?: string; password?: string };

export default function SignUpScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const { signUp } = useSession();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mobile, setMobile] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<TranslationKey | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    const errors: FieldErrors = {};
    if (!name.trim()) errors.name = t("auth.validation.nameRequired");
    if (!email.trim()) errors.email = t("auth.validation.emailRequired");
    else if (!isValidEmail(email))
      errors.email = t("auth.validation.emailInvalid");
    if (!password) errors.password = t("auth.validation.passwordRequired");
    else if (password.length < MIN_PASSWORD_LENGTH)
      errors.password = t("auth.validation.passwordTooShort");

    setFieldErrors(errors);
    setFormError(null);
    if (Object.keys(errors).length > 0) return;

    setSubmitting(true);
    try {
      await signUp({
        name: name.trim(),
        email: email.trim(),
        password,
        // Omitted rather than sent empty: the DTO treats it as optional, and
        // an empty string would be stored as a real (blank) mobile number.
        mobile: mobile.trim() || undefined,
      });
    } catch (error) {
      setFormError(
        isApiError(error)
          ? error.status === 409
            ? "errors.emailTaken"
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
        <View></View>
        <LanguageToggle />
      </View>

      <View style={styles.header}>
        <BrandMark />
        <View style={styles.headings}>
          <Text variant="title1">{t("auth.signUp.title")}</Text>
          <Text variant="callout" color="textSecondary">
            {t("auth.signUp.subtitle")}
          </Text>
        </View>
      </View>

      <View style={styles.form}>
        {formError ? <Banner message={t(formError)} /> : null}

        <TextField
          label={t("auth.fields.name")}
          required
          leadingIcon={UserIcon}
          placeholder={t("auth.fields.namePlaceholder")}
          value={name}
          onChangeText={setName}
          error={fieldErrors.name}
          autoComplete="name"
          textContentType="name"
        />

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
          autoComplete="new-password"
          textContentType="newPassword"
        />

        <TextField
          label={t("auth.fields.mobile")}
          leadingIcon={SmartPhone01Icon}
          placeholder={t("auth.fields.mobilePlaceholder")}
          value={mobile}
          onChangeText={setMobile}
          autoComplete="tel"
          keyboardType="phone-pad"
          textContentType="telephoneNumber"
        />

        <Button
          label={t("auth.signUp.submit")}
          loading={submitting}
          onPress={() => void handleSubmit()}
          style={styles.submit}
        />
      </View>

      <View style={styles.footer}>
        <Text variant="footnote" color="textSecondary">
          {t("auth.signUp.hasAccount")}
        </Text>
        <Link href="/sign-in" asChild>
          <Text variant="footnote" color="primary" accessibilityRole="link">
            {t("auth.signUp.goToSignIn")}
          </Text>
        </Link>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  header: {
    // Wider than the gap between the two headings, so the mark reads as its own
    // element rather than a third line of the title block.
    gap: Spacing.lg,
    // Tighter than sign-in's 2xl on both ends: this form carries four fields,
    // so the header gives up the slack instead of the inputs.
    marginTop: Spacing.xl,
    marginBottom: Spacing.xl,
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
