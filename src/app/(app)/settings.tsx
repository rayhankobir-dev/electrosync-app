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
import {
  Alert,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import { isApiError } from "@/api/errors";
import type { UpdateUserSettingsPayload } from "@/api/types";
import { AccountCard } from "@/components/account-card";
import { BrandMark } from "@/components/brand-mark";
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
import { useToast } from "@/components/ui/toast-host";
import {
  useUpdateUserSettings,
  useUserSettings,
} from "@/hooks/use-user-settings";
import { useI18n, type TranslationKey } from "@/i18n";
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
    <Screen
      scrollable
      edgeToEdgeBottom={false}
      header={<ScreenHeader title={t("settings.title")} />}
    >
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

      {/* Sits under the last group rather than at the top of the screen: the
          mark is a sign-off, not a heading, and the settings the user came for
          should be the first thing on the page. */}
      <View style={styles.footer}>
        <BrandMark size={48} />
        <Text variant="footnote" color="textTertiary" align="center">
          {`${t("common.appName")} ${
            Constants.expoConfig?.version ?? ""
          }`.trim()}
        </Text>
        <DeveloperCredit />
      </View>
    </Screen>
  );
}

const DEVELOPER = { name: "coderbrix.com", url: "https://coderbrix.com" };

/**
 * The whole line is the target, not just the domain inside it: splitting the
 * sentence so only "coderbrix.com" responds would leave a tap target a few
 * characters wide at footnote size, and the credit reads as one phrase anyway.
 */
function DeveloperCredit() {
  const { t } = useI18n();
  const toast = useToast();

  return (
    <Pressable
      accessibilityRole="link"
      accessibilityLabel={t("common.developedBy", { company: DEVELOPER.name })}
      hitSlop={Spacing.sm}
      // Rejects when the device has nothing registered for https — rare, but a
      // credit that appears to do nothing on tap is worse than one that says why.
      onPress={() =>
        void Linking.openURL(DEVELOPER.url).catch(() =>
          toast.error(t("common.linkFailed")),
        )
      }
    >
      <Text variant="caption" color="textTertiary" align="center">
        {t("common.developedBy", { company: DEVELOPER.name })}
      </Text>
    </Pressable>
  );
}

const THRESHOLDS = [50, 100, 200, 500] as const;

function Notifications() {
  const { t, formatCurrency } = useI18n();
  const toast = useToast();
  const {
    data: settings,
    isError,
    error,
    isFetching,
    refetch,
  } = useUserSettings();
  const { mutate } = useUpdateUserSettings();

  /**
   * Every control in this section commits through here, so the confirmation is
   * written once rather than repeated at four call sites.
   *
   * Why confirm at all, when the write is optimistic and the switch has already
   * moved? Precisely because it has. The optimistic update means the control
   * looks identical whether the request reached the server or is still in flight,
   * so without a message the user has no way to tell a saved preference from one
   * that is about to silently roll back.
   */
  function save(payload: UpdateUserSettingsPayload, confirmation: string) {
    mutate(payload, {
      onSuccess: () => toast.success(confirmation),
      // The hook has already put the control back by the time this runs; this
      // only supplies the reason, which the reverting switch cannot.
      onError: (cause: unknown) =>
        toast.error(
          t("settings.saveFailed"),
          t(isApiError(cause) ? cause.messageKey : "errors.unknown"),
        ),
    });
  }

  /**
   * "Push notifications turned on" — the setting's own label plus its new state.
   * Named rather than a bare "Saved" because four controls share one toast slot,
   * and an unattributed acknowledgement does not say which one it belongs to.
   */
  function toggled(setting: TranslationKey, on: boolean): string {
    return t(on ? "settings.turnedOn" : "settings.turnedOff", {
      setting: t(setting),
    });
  }

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
            onValueChange={(next) =>
              save(
                { pushEnabled: next },
                toggled("settings.pushEnabled", next),
              )
            }
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
            onValueChange={(next) =>
              save(
                { lowBalanceAlerts: next },
                toggled("settings.lowBalanceAlerts", next),
              )
            }
            accessibilityLabel={t("settings.lowBalanceAlerts")}
          />
        }
      />

      <ThresholdRow
        label={t("settings.lowBalanceThreshold")}
        value={threshold}
        disabled={mutedByPush || !lowBalanceAlerts}
        onChange={(next) =>
          // Not the on/off template: an amount is not a state being switched, so
          // it confirms by restating the rule the user just set.
          save(
            { lowBalanceThreshold: next },
            t("settings.thresholdSaved", { amount: formatCurrency(next, 0) }),
          )
        }
      />

      <ListRow
        icon={FlashIcon}
        label={t("settings.rechargeAlerts")}
        disabled={mutedByPush}
        trailing={
          <Switch
            value={rechargeAlerts}
            disabled={mutedByPush}
            onValueChange={(next) =>
              save(
                { rechargeAlerts: next },
                toggled("settings.rechargeAlerts", next),
              )
            }
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
          leadingIcon={FlashIcon}
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
  footer: {
    alignItems: "center",
    // Tighter than the gap between sections: the mark and the version line read
    // as one lockup, not as two more items in the list above them.
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
});
