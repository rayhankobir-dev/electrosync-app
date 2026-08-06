import {
  Alert02Icon,
  BellDotIcon,
  BellRingIcon,
  FlashIcon,
  LanguageSquareIcon,
  Logout01Icon,
  Moon02Icon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react-native";
import Constants from "expo-constants";
import { useState, type ReactNode } from "react";
import { Alert, Platform, StyleSheet, View } from "react-native";

import { isApiError } from "@/api/errors";
import { AccountCard } from "@/components/account-card";
import { LanguageToggle } from "@/components/language-toggle";
import { ScreenHeader } from "@/components/screen-header";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { CardPadding } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { ListGroup, ListRow } from "@/components/ui/list-row";
import { Screen } from "@/components/ui/screen";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
import { TextField } from "@/components/ui/text-field";
import {
  useUpdateUserSettings,
  useUserSettings,
} from "@/hooks/use-user-settings";
import { useI18n } from "@/i18n";
import {
  parseWholeAmount,
  THRESHOLD_MAX,
  THRESHOLD_MIN,
} from "@/lib/validation";
import { useSession } from "@/session";
import { Spacing, useTheme } from "@/theme";

export default function SettingsScreen() {
  const { t } = useI18n();
  const { mode, setMode, scheme } = useTheme();
  const { signOut, user } = useSession();

  function handleSignOut() {
    if (Platform.OS === "web") {
      void signOut();
      return;
    }

    Alert.alert(t("auth.signOutConfirm"), undefined, [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("auth.signOut"),
        style: "destructive",
        onPress: () => void signOut(),
      },
    ]);
  }

  return (
    <Screen scrollable edgeToEdgeBottom={false}>
      <ScreenHeader title={t("settings.title")} />

      {user ? (
        <View style={styles.block}>
          <AccountCard user={user} />
        </View>
      ) : null}

      <Section>
        <ListRow
          icon={Moon02Icon}
          label={t("settings.darkMode")}
          trailing={
            <Switch
              value={scheme === "dark"}
              disabled={mode === "system"}
              onValueChange={(next) => setMode(next ? "dark" : "light")}
              accessibilityLabel={t("settings.darkMode")}
            />
          }
        />

        <ListRow
          icon={LanguageSquareIcon}
          label={t("settings.language")}
          trailing={<LanguageToggle />}
        />
      </Section>

      <Notifications />

      <View style={styles.block}>
        <ListGroup>
          <ListRow
            icon={Logout01Icon}
            label={t("auth.signOut")}
            tone="danger"
            onPress={handleSignOut}
          />
        </ListGroup>
      </View>

      <Text
        variant="footnote"
        color="textTertiary"
        align="center"
        style={styles.version}
      >
        {`${t("common.appName")} ${Constants.expoConfig?.version ?? ""}`.trim()}
      </Text>
    </Screen>
  );
}

const THRESHOLDS = [50, 100, 200, 500] as const;

function Notifications() {
  const { t } = useI18n();
  const {
    data: settings,
    isError,
    error,
    isFetching,
    refetch,
  } = useUserSettings();
  const { mutate } = useUpdateUserSettings();

  if (isError) {
    return (
      <Section icon={BellRingIcon} label={t("settings.notification")}>
        <View style={styles.threshold}>
          <Banner
            message={t(isApiError(error) ? error.messageKey : "errors.unknown")}
          />
          <Button
            label={t("common.retry")}
            variant="secondary"
            size="md"
            loading={isFetching}
            onPress={() => void refetch()}
          />
        </View>
      </Section>
    );
  }

  // Until the account's settings arrive there is nothing truthful to show a
  // switch as, so the whole section is inert and the values below are only
  // placeholders to keep the rows at their final height.
  const loading = !settings;
  const pushEnabled = settings?.pushEnabled ?? false;
  const lowBalanceAlerts = settings?.lowBalanceAlerts ?? false;
  const rechargeAlerts = settings?.rechargeAlerts ?? false;
  const threshold = settings?.lowBalanceThreshold ?? THRESHOLDS[1];

  // Everything else is meaningless while the master switch is off.
  const mutedByPush = loading || !pushEnabled;

  return (
    <Section>
      <ListRow
        icon={BellDotIcon}
        label={t("settings.pushEnabled")}
        detail={t("settings.pushEnabledHint")}
        disabled={loading}
        trailing={
          <Switch
            value={pushEnabled}
            disabled={loading}
            onValueChange={(next) => mutate({ pushEnabled: next })}
            accessibilityLabel={t("settings.pushEnabled")}
          />
        }
      />

      <ListRow
        icon={Alert02Icon}
        label={t("settings.lowBalanceAlerts")}
        disabled={mutedByPush}
        trailing={
          <Switch
            value={lowBalanceAlerts}
            disabled={mutedByPush}
            onValueChange={(next) => mutate({ lowBalanceAlerts: next })}
            accessibilityLabel={t("settings.lowBalanceAlerts")}
          />
        }
      />

      <ThresholdRow
        label={t("settings.lowBalanceThreshold")}
        value={threshold}
        disabled={mutedByPush || !lowBalanceAlerts}
        onChange={(next) => mutate({ lowBalanceThreshold: next })}
      />

      <ListRow
        icon={FlashIcon}
        label={t("settings.rechargeAlerts")}
        disabled={mutedByPush}
        trailing={
          <Switch
            value={rechargeAlerts}
            disabled={mutedByPush}
            onValueChange={(next) => mutate({ rechargeAlerts: next })}
            accessibilityLabel={t("settings.rechargeAlerts")}
          />
        }
      />
    </Section>
  );
}

/** Sentinel segment value. Not a number, so it can never collide with a preset. */
const OTHER = "other";

/**
 * Not a `ListRow`: five segments plus a revealed input will not fit beside a
 * label on a narrow phone, so the control drops to its own line instead of
 * being squeezed into the trailing slot.
 */
function ThresholdRow({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  disabled: boolean;
  onChange(next: number): void;
}) {
  const { t, formatCurrency } = useI18n();

  /**
   * An override on top of a derivation, not a copy of the selection. `value`
   * arrives asynchronously, so storing "is custom" outright would compute it
   * against the placeholder threshold on first render and never revisit it when
   * the account's real — possibly non-preset — amount landed. This way an
   * off-preset value selects Other on its own, and the flag only covers the case
   * the data cannot imply: Other chosen while the amount is still a preset.
   */
  const [customChosen, setCustomChosen] = useState(false);
  const [draft, setDraft] = useState(() => String(value));
  const [invalid, setInvalid] = useState(false);
  const [mirrored, setMirrored] = useState(value);

  const isPreset = (THRESHOLDS as readonly number[]).includes(value);
  const showCustom = customChosen || !isPreset;

  /**
   * Re-seeds the field whenever the committed amount changes underneath — the
   * optimistic cache write, or the reconciling refetch. Adjusted during render
   * rather than in an effect: an effect would commit a render and then
   * immediately schedule another, which is what `react-hooks/set-state-in-effect`
   * flags. Typing does not change `value`, so this never fights the user mid-edit.
   */
  if (mirrored !== value) {
    setMirrored(value);
    setDraft(String(value));
    setInvalid(false);
  }

  const options = [
    ...THRESHOLDS.map((amount) => ({
      value: String(amount),
      label: formatCurrency(amount, 0),
    })),
    { value: OTHER, label: t("settings.thresholdOther") },
  ];

  function handleSegment(next: string) {
    if (next === OTHER) {
      // Seeded from the amount in force, so the field opens on the current value
      // rather than empty — editing 100 to 120 should not mean retyping it.
      setCustomChosen(true);
      setDraft(String(value));
      setInvalid(false);
      return;
    }

    setCustomChosen(false);
    setInvalid(false);
    onChange(Number(next));
  }

  /**
   * On blur and submit rather than on change: a PATCH per keystroke would fire
   * three requests on the way to typing "250", and the intermediate values are
   * ones the user never chose.
   */
  function commit() {
    const parsed = parseWholeAmount(draft);

    if (parsed === null || parsed < THRESHOLD_MIN || parsed > THRESHOLD_MAX) {
      setInvalid(true);
      return;
    }

    setInvalid(false);
    if (parsed !== value) onChange(parsed);
  }

  return (
    <View
      style={[styles.threshold, disabled ? styles.thresholdDisabled : null]}
      // `SegmentedControl` has no disabled state of its own, and blocking touches
      // at the wrapper avoids giving it one just for this caller.
      pointerEvents={disabled ? "none" : "auto"}
    >
      <Text variant="subhead" color="textSecondary">
        {label}
      </Text>

      <SegmentedControl
        options={options}
        value={showCustom ? OTHER : String(value)}
        onChange={handleSegment}
      />

      {showCustom ? (
        <TextField
          label={t("settings.thresholdCustom")}
          required
          value={draft}
          onChangeText={setDraft}
          onBlur={commit}
          onSubmitEditing={commit}
          error={
            invalid
              ? t("settings.thresholdRange", {
                  min: formatCurrency(THRESHOLD_MIN, 0),
                  max: formatCurrency(THRESHOLD_MAX, 0),
                })
              : null
          }
          keyboardType="number-pad"
          returnKeyType="done"
          maxLength={6}
          // Opens focused, because the segment tap was the request to edit it.
          autoFocus={customChosen}
        />
      ) : null}
    </View>
  );
}

/**
 * Shared by `Section` and the account block, which cannot use `Section` itself —
 * that wraps its children in a `ListGroup`, and `AccountCard` is not a list row.
 *
 * The icon is sized to the caption's 12pt and tinted `textTertiary` to match the
 * text exactly: it is an accent on the heading, not a control, and an icon that
 * out-weighs its own label pulls the eye away from the rows underneath.
 */
function SectionLabel({
  icon,
  label,
}: {
  icon?: IconSvgElement;
  label: string;
}) {
  return (
    <View style={styles.sectionHeader}>
      {icon ? <Icon icon={icon} size={14} color="textTertiary" /> : null}
      <Text variant="caption" color="textTertiary" style={styles.sectionLabel}>
        {label.toUpperCase()}
      </Text>
    </View>
  );
}

function Section({
  icon,
  label,
  children,
}: {
  icon?: IconSvgElement;
  label?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.block}>
      {/* Omitted entirely when unlabelled — an empty `Text` still occupies its
          line height and margin, leaving a gap with nothing in it. */}
      {label ? <SectionLabel icon={icon} label={label} /> : null}
      <ListGroup>{children}</ListGroup>
    </View>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: Spacing.lg,
  },
  block: {
    marginBottom: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs + 2,
    // Moved off the label itself: with the icon beside it, the gap below belongs
    // to the header as a whole, not to one of the two things inside it.
    marginBottom: Spacing.sm,
  },
  sectionLabel: {
    letterSpacing: 0.6,
  },
  threshold: {
    // Matches `ListRow`'s own insets so the label lines up with the labels of
    // the switch rows above and below it.
    paddingHorizontal: CardPadding,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  thresholdDisabled: {
    opacity: 0.4,
  },
  version: {
    marginTop: Spacing.sm,
  },
});
