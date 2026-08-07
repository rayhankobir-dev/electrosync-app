import {
  AlertCircleIcon,
  BatteryCharging02Icon,
  ChartHistogramIcon,
  CheckmarkCircle02Icon,
  Copy01Icon,
  DashboardSpeed01Icon,
  FlashOffIcon,
  IdIcon,
  PlusSignIcon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon, type IconSvgElement } from "@hugeicons/react-native";
import * as Clipboard from "expo-clipboard";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { isApiError } from "@/api/errors";
import type { Meter } from "@/api/types";
import {
  ProviderRibbon,
  RIBBON_HEIGHT,
  RibbonBand,
  TypeRibbon,
} from "@/components/card-ribbons";
import { MeterArtwork } from "@/components/meter-artwork";
import { useMeterForm } from "@/components/meter-form-host";
import { QuickActions, type QuickAction } from "@/components/quick-actions";
import { ScreenHeader } from "@/components/screen-header";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card, CardPadding } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Screen } from "@/components/ui/screen";
import {
  SkeletonBlock,
  SkeletonGroup,
  SkeletonLine,
  SkeletonTile,
} from "@/components/ui/skeleton";
import { Text } from "@/components/ui/text";
import { useToast } from "@/components/ui/toast-host";
import { UsageTrendCard } from "@/components/usage-trend-card";
import { WeeklyRhythmCard } from "@/components/weekly-rhythm-card";
import { useUsageTrend } from "@/hooks/use-analytics";
import { usePrimaryMeter } from "@/hooks/use-meters";
import { useCustomerInfo, useRecharges } from "@/hooks/use-utility-data";
import { useI18n, type TranslationKey } from "@/i18n";
import { useSession } from "@/session";
import { HitSlop, Radius, Spacing, useTheme, type ColorName } from "@/theme";
import { utilityFor, type UtilityRecharge } from "@/utility";

export default function HomeScreen() {
  const { t } = useI18n();
  const { user } = useSession();
  const { meter, isLoading } = usePrimaryMeter();

  /**
   * The same query the hero card reads — react-query hands both callers one
   * instance, so this costs no extra request and refetching here refreshes the
   * card. Lifted to the screen because pull-to-refresh belongs to the scroll
   * view, and it is what replaced the reload button that used to sit in the
   * card's corner.
   */
  const info = useCustomerInfo(meter);

  return (
    <Screen edgeToEdgeBottom={false}>
      <ScreenHeader title={t("home.greeting", { name: user?.name ?? "" })} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={info.isFetching}
            onRefresh={() => void info.refetch()}
          />
        }
      >
        {isLoading ? (
          <HomeSkeleton />
        ) : meter ? (
          <MeterDashboard meter={meter} />
        ) : (
          <NoMeter />
        )}
      </ScrollView>
    </Screen>
  );
}

/**
 * The screen before the primary meter arrives.
 *
 * Covers the hero and the quick actions but stops there. The two analytics cards
 * below fetch independently and manage their own waiting — and one of them may
 * legitimately render nothing at all, so a placeholder promising a card would be
 * a promise this screen cannot keep.
 */
function HomeSkeleton() {
  const { colors } = useTheme();

  return (
    <View style={styles.stack}>
      <Card style={styles.heroCard}>
        <SkeletonGroup>
          <RibbonBand padding={HERO_PADDING}>
            <SkeletonBlock
              width={84}
              height={RIBBON_HEIGHT}
              radius={Radius.md}
            />
            <SkeletonBlock
              width={84}
              height={RIBBON_HEIGHT}
              radius={Radius.md}
            />
          </RibbonBand>

          <View style={styles.meterHead}>
            <SkeletonTile size={48} />

            <View style={styles.skeletonLines}>
              <SkeletonLine width="70%" height={18} />
              <SkeletonLine width="45%" height={12} />
            </View>

            {/* Right-aligned to land where the balance will, so the amount does
                not slide across the card when it resolves. */}
            <View style={styles.skeletonBalance}>
              <SkeletonLine width={64} height={10} />
              <SkeletonLine width={104} height={24} />
            </View>
          </View>

          {/* Tinted like the real strip, so the card's base is already there
              when the numbers land rather than appearing under them. */}
          <View
            style={[
              styles.skeletonFooter,
              { backgroundColor: colors.surfacePressed },
            ]}
          >
            <View style={styles.skeletonLines}>
              <SkeletonLine width="55%" height={10} />
              <SkeletonLine width="35%" height={14} />
            </View>
            <View style={styles.skeletonLines}>
              <SkeletonLine width="55%" height={10} />
              <SkeletonLine width="45%" height={14} />
            </View>
          </View>
        </SkeletonGroup>
      </Card>

      <Card>
        <SkeletonGroup>
          <SkeletonLine width={96} height={12} />
          <View style={styles.skeletonTiles}>
            {[0, 1, 2, 3].map((index) => (
              <View key={index} style={styles.skeletonTile}>
                <SkeletonBlock width={48} height={48} radius={Radius.full} />
                <SkeletonLine width="80%" height={10} />
              </View>
            ))}
          </View>
        </SkeletonGroup>
      </Card>
    </View>
  );
}

function NoMeter() {
  const { t } = useI18n();
  // Opens the sheet in place. Sending the user to the Meters tab to press a
  // second button made them do the same work twice.
  const meterForm = useMeterForm();

  return (
    <Card>
      <View style={styles.emptyArt}>
        <MeterArtwork type="HOME" size={96} />
      </View>
      <Text variant="title3" align="center">
        {t("home.noMeterTitle")}
      </Text>
      <Text
        variant="callout"
        color="textSecondary"
        align="center"
        style={styles.gap}
      >
        {t("home.noMeterBody")}
      </Text>
      <Button
        label={t("meters.add")}
        onPress={meterForm.add}
        style={styles.cta}
      />
    </Card>
  );
}

function MeterDashboard({ meter }: { meter: Meter }) {
  const { t } = useI18n();
  const router = useRouter();
  const meterForm = useMeterForm();
  const utility = utilityFor(meter.provider);

  // `info` carries `currentBalance`, so there is no separate balance request —
  // these routes are live portal scrapes and one page should be fetched once.
  const info = useCustomerInfo(meter);

  if (!utility.supported) {
    return (
      <Card style={styles.heroCard}>
        <RibbonBand padding={HERO_PADDING}>
          <TypeRibbon type={meter.type} />
          <ProviderRibbon provider={meter.provider} />
        </RibbonBand>

        <View style={styles.meterHead}>
          <MeterArtwork type={meter.type} size={56} />
          <View style={styles.meterTitle}>
            <Text variant="title3" numberOfLines={1}>
              {meter.label ?? meter.customerNo}
            </Text>
            <Text variant="footnote" color="textTertiary" numeric>
              {meter.customerNo}
            </Text>
          </View>
        </View>

        <Text
          variant="callout"
          color="textSecondary"
          style={styles.unsupportedNote}
        >
          {t("meters.unsupportedBody", { utility: t(utility.nameKey) })}
        </Text>
      </Card>
    );
  }

  /**
   * The three sections of the meter's detail screen, each opened directly on
   * its own tab, plus adding a meter.
   *
   * Adding is the one shortcut here that duplicates something already reachable
   * in a tap — the tab bar's action button. It earns the tile anyway: this
   * screen shows a single meter, so "where do the others go?" is asked from
   * exactly here, and the disc in the bar is unlabelled. Notifications and
   * settings stay out; both are labelled and one tap away.
   */
  const quickActions: readonly QuickAction[] = [
    {
      key: "recharges",
      icon: BatteryCharging02Icon,
      label: t("details.recharges"),
      // Object form rather than a template string: typed routes are on, so the
      // pathname has to stay the literal route pattern for the param to type.
      onPress: () =>
        router.push({
          pathname: "/meter/[id]",
          params: { id: meter.id, tab: "recharges" },
        }),
    },
    {
      key: "consumption",
      icon: ChartHistogramIcon,
      label: t("details.consumption"),
      onPress: () =>
        router.push({
          pathname: "/meter/[id]",
          params: { id: meter.id, tab: "consumption" },
        }),
    },
    {
      key: "info",
      icon: DashboardSpeed01Icon,
      label: t("details.info"),
      onPress: () =>
        router.push({
          pathname: "/meter/[id]",
          params: { id: meter.id, tab: "info" },
        }),
    },
    {
      key: "add",
      icon: PlusSignIcon,
      label: t("meters.add"),
      // The same sheet the tab bar's action button opens — it is hosted above
      // the navigator, so both entry points drive the one instance.
      onPress: meterForm.add,
    },
  ];

  return (
    <View style={styles.stack}>
      <MeterHero meter={meter} info={info} />

      {/*
        Directly under the balance: the balance is what the user came for, and
        the shortcuts are what they reach for next — "where did that go" and
        "how much have I used". Above the analytics cards so they stay in the
        first screenful rather than below a chart.
      */}
      <QuickActions title={t("home.quickActions")} actions={quickActions} />

      {/*
        Both cards read from `/analytics/usage`, which serves stored samples
        rather than scraping the portal — so they render immediately and do not
        wait on `info`. The rhythm card returns null until it has enough
        history to draw a pattern worth believing.
      */}
      <UsageTrendCard meterId={meter.id} />
      <WeeklyRhythmCard meterId={meter.id} />
    </View>
  );
}

/**
 * The screen's headline card: whose meter, what is left on it, and the two
 * numbers that say whether that is a comfortable amount — what yesterday cost,
 * and how long ago it was last topped up.
 *
 * No reload button. It used to sit in the top-right, which is now the
 * provider's ribbon — and the gesture it duplicated, pull-to-refresh, is where
 * a user reaches first anyway. `HomeScreen` owns that control and drives the
 * same query, so nothing was lost. Dropping it also stops the corner flickering
 * between a spinner and an icon on every background refetch.
 */
function MeterHero({
  meter,
  info,
}: {
  meter: Meter;
  info: ReturnType<typeof useCustomerInfo>;
}) {
  const { t, formatCurrency, formatNumber } = useI18n();
  const { colors } = useTheme();
  const { yesterday } = useUsageTrend(meter.id);
  const recharges = useRecharges(meter);

  const balance = info.data?.currentBalance ?? null;
  const low = balance !== null && balance < LOW_BALANCE;

  /**
   * A day the sweep never sampled is padded in at zero with `coverage: 0`, and
   * "you spent nothing" is not the same claim as "we did not look". Only a
   * measured day gets to print an amount.
   */
  const spentYesterday =
    yesterday && yesterday.coverage > 0 ? yesterday.consumedCost : null;

  const daysSinceRecharge = daysSinceLastRecharge(recharges.data);

  return (
    <Card style={styles.heroCard}>
      <RibbonBand padding={HERO_PADDING}>
        <TypeRibbon type={meter.type} />
        <ProviderRibbon provider={meter.provider} />
      </RibbonBand>

      {/*
        Identity on the left, balance on the right, sharing one row. The label
        column takes what is left after the two fixed ends, so a long meter name
        ellipsises rather than pushing the amount off the card.
      */}
      <View style={styles.meterHead}>
        <MeterArtwork type={meter.type} size={48} />

        <View style={styles.meterTitle}>
          <Text variant="title3" numberOfLines={1}>
            {meter.label ?? meter.customerNo}
          </Text>

          <CustomerNo value={meter.customerNo} />
        </View>

        {info.isError ? null : (
          <View style={styles.balanceBlock}>
            <Text variant="micro" color="textTertiary" style={styles.eyebrow}>
              {t("home.balance").toUpperCase()}
            </Text>

            {info.isPending ? (
              <ActivityIndicator size="small" style={styles.gap} />
            ) : (
              <Text
                variant="title1"
                numeric
                numberOfLines={1}
                color={low ? "danger" : "text"}
              >
                {formatCurrency(info.data.currentBalance)}
              </Text>
            )}
          </View>
        )}
      </View>

      {info.isError ? (
        // `Banner` takes no style, so the gap above it lives on a wrapper.
        <View style={styles.notice}>
          <Banner
            message={t(
              isApiError(info.error) ? info.error.messageKey : "errors.unknown",
            )}
          />
        </View>
      ) : null}

      {/*
        A footer strip rather than two more lines in the stack: it runs to the
        card's edges over a tinted fill, which separates "supporting numbers"
        from the balance above without a rule or a second card.

        Rendered whatever the balance did — these come from stored samples and
        the recharge list, so a failed portal scrape does not take them with it.
      */}
      <View
        style={[
          styles.footer,
          {
            borderTopWidth: 1,
            borderColor: colors.border,
            backgroundColor: colors.surfacePressed,
          },
        ]}
      >
        <HeroStat
          icon={ChartHistogramIcon}
          label={t("home.yesterday")}
          value={
            spentYesterday === null
              ? t("home.notMeasured")
              : formatCurrency(spentYesterday, 0)
          }
          muted={spentYesterday === null}
        />

        <View style={[styles.footerRule, { backgroundColor: colors.border }]} />

        <HeroStat
          icon={BatteryCharging02Icon}
          label={t("home.lastRecharge")}
          value={rechargeAge(daysSinceRecharge, t, formatNumber)}
          muted={daysSinceRecharge === null}
        />
      </View>

      {/*
        Below the footer strip, and only once the balance is actually known: a
        band claiming the supply is fine while the amount above it is still a
        spinner — or an error — would be stating something we cannot see.
      */}
      {balance === null ? null : <SupplyStatus balance={balance} />}
    </Card>
  );
}

/**
 * What the balance means for the lights, said in words.
 *
 * The number above answers "how much"; this answers the question the user
 * actually has — "am I about to be cut off". Three states rather than the two the
 * amount implies: the balance already turns red below `LOW_BALANCE`, so a green
 * "no issues" at ৳20 left would contradict the figure directly above it.
 */
function SupplyStatus({ balance }: { balance: number }) {
  const { t } = useI18n();
  const { colors } = useTheme();

  const state = balance <= 0 ? "out" : balance < LOW_BALANCE ? "low" : "ok";

  const { icon, tone, fill, titleKey, bodyKey } = SUPPLY_STATES[state];

  return (
    <View
      style={[
        styles.supply,
        {
          borderTopWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors[fill],
        },
      ]}
    >
      <View style={[styles.supplyIcon, { backgroundColor: colors[tone] }]}>
        <HugeiconsIcon icon={icon} size={18} strokeWidth={2} color="#FFFFFF" />
      </View>

      <View style={styles.supplyCopy}>
        <Text variant="subhead" color={tone}>
          {t(titleKey)}
        </Text>
        <Text variant="footnote" color="textSecondary">
          {t(bodyKey)}
        </Text>
      </View>
    </View>
  );
}

/**
 * The three supply states, as a table rather than a chain of ternaries: icon,
 * text colour and fill have to move together, and side by side it is obvious
 * that they do.
 */
const SUPPLY_STATES = {
  ok: {
    icon: CheckmarkCircle02Icon,
    tone: "success",
    fill: "successSoft",
    titleKey: "home.supplyOkTitle",
    bodyKey: "home.supplyOkBody",
  },
  low: {
    icon: AlertCircleIcon,
    tone: "warning",
    fill: "warningSoft",
    titleKey: "home.supplyLowTitle",
    bodyKey: "home.supplyLowBody",
  },
  // A struck-through bolt rather than another alert circle: this is the one state
  // where the supply itself is the subject, not the amount.
  out: {
    icon: FlashOffIcon,
    tone: "danger",
    fill: "dangerSoft",
    titleKey: "home.supplyOutTitle",
    bodyKey: "home.supplyOutBody",
  },
} as const satisfies Record<
  string,
  {
    icon: IconSvgElement;
    tone: ColorName;
    fill: ColorName;
    titleKey: TranslationKey;
    bodyKey: TranslationKey;
  }
>;

/**
 * The customer number, flanked by an ID glyph and a copy button.
 *
 * It exists to be copied — it is what the user types into a recharge app or
 * reads down the phone — so the affordance sits on the number itself rather
 * than behind a long-press the user has to guess at.
 */
function CustomerNo({ value }: { value: string }) {
  const { t } = useI18n();
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  /**
   * The tick replaces the glyph for a moment on success. The toast says the same
   * thing, but it appears at the edge of the screen — the confirmation people
   * actually look for is on the control they just pressed.
   */
  useEffect(() => {
    if (!copied) return;

    const timer = setTimeout(() => setCopied(false), COPIED_FEEDBACK_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  async function copy() {
    try {
      await Clipboard.setStringAsync(value);
      setCopied(true);
      toast.success(t("home.customerNoCopied"));
    } catch {
      // Rare enough to have no dedicated string — the generic failure is
      // honest, and silence here would look like the tap missed.
      toast.error(t("errors.unknown"));
    }
  }

  return (
    <View style={styles.customerNo}>
      <Icon icon={IdIcon} size={14} color="textTertiary" />

      {/* `shrink` rather than `flex: 1`: the number should take only the width
          it needs, so the button sits against it instead of drifting out to the
          column's right edge. */}
      <Text
        variant="footnote"
        color="textTertiary"
        numeric
        numberOfLines={1}
        style={styles.customerNoValue}
      >
        {value}
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("home.copy")}
        hitSlop={HitSlop / 4}
        onPress={() => void copy()}
      >
        <Icon
          icon={copied ? Tick02Icon : Copy01Icon}
          size={14}
          color={copied ? "success" : "textTertiary"}
        />
      </Pressable>
    </View>
  );
}

/** How long the tick stays after a copy. */
const COPIED_FEEDBACK_MS = 1600;

/** One half of the hero's footer strip. */
function HeroStat({
  icon,
  label,
  value,
  muted,
}: {
  icon: IconSvgElement;
  label: string;
  value: string;
  muted: boolean;
}) {
  return (
    <View style={styles.stat}>
      <View style={styles.statLabel}>
        <Icon icon={icon} size={14} color="textTertiary" />
        <Text variant="micro" color="textTertiary" numberOfLines={1}>
          {label.toUpperCase()}
        </Text>
      </View>
      <Text
        variant="subhead"
        numeric
        numberOfLines={1}
        color={muted ? "textTertiary" : "text"}
      >
        {value}
      </Text>
    </View>
  );
}

/** Below this the balance is shown in the danger tone. Matches the meter card. */
const LOW_BALANCE = 100;

/** The hero's own padding, which its ribbon band has to cancel out exactly. */
const HERO_PADDING = CardPadding;

/**
 * Whole days between the newest recharge and now, or null when the meter has
 * never been topped up — or the list has not arrived yet.
 *
 * Floored rather than rounded: a top-up 30 hours ago is "1 day ago", not two.
 * `rechargedDate` is epoch *seconds*, as everywhere else this list is read.
 */
function daysSinceLastRecharge(
  recharges: readonly UtilityRecharge[] | undefined,
): number | null {
  if (!recharges?.length) return null;

  const newest = recharges.reduce((latest, row) =>
    row.rechargedDate > latest.rechargedDate ? row : latest,
  );

  const elapsedMs = Date.now() - newest.rechargedDate * 1000;
  // A portal clock running slightly ahead of the device's would otherwise
  // produce "-0 days ago".
  return Math.max(0, Math.floor(elapsedMs / 86_400_000));
}

/**
 * "6 days ago". Today and yesterday get words instead of a count — "0 days ago"
 * is a sentence no one says.
 */
function rechargeAge(
  days: number | null,
  t: ReturnType<typeof useI18n>["t"],
  formatNumber: ReturnType<typeof useI18n>["formatNumber"],
): string {
  if (days === null) return t("home.rechargeNone");
  if (days === 0) return t("home.rechargeToday");
  if (days === 1) return t("home.rechargeYesterday");
  return t("home.rechargeDaysAgo", { days: formatNumber(days) });
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.lg,
    paddingBottom: Spacing["2xl"],
  },
  stack: {
    gap: Spacing.lg,
  },
  // Padding lands on the inner blocks instead, so the ribbon band and the
  // footer strip can both run to the card's edges.
  heroCard: {
    padding: HERO_PADDING,
    paddingBottom: 0,
  },
  meterHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  meterTitle: {
    flex: 1,
    gap: 2,
    // Nothing here is worth pushing the balance off the card, so this column is
    // the one that yields. Explicit because a flex child's default `minWidth`
    // is its content, which would let a long label win the argument.
    minWidth: 0,
  },
  // Looser than the 2px that holds real text lines together: a glyph box
  // carries leading, a solid bar does not, so the same gap between bars reads
  // as one thick block.
  skeletonLines: {
    flex: 1,
    gap: Spacing.sm,
  },
  skeletonBalance: {
    alignItems: "flex-end",
    gap: Spacing.sm,
  },
  skeletonFooter: {
    flexDirection: "row",
    gap: Spacing.lg,
    marginHorizontal: -HERO_PADDING,
    marginTop: Spacing.lg,
    paddingHorizontal: HERO_PADDING,
    paddingVertical: Spacing.md,
  },
  skeletonTiles: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  skeletonTile: {
    flex: 1,
    alignItems: "center",
    gap: Spacing.sm,
  },
  customerNo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  customerNoValue: {
    flexShrink: 1,
  },
  eyebrow: {
    letterSpacing: 0.4,
  },
  footer: {
    flexDirection: "row",
    alignItems: "stretch",
    // Out past the card's padding, so the strip meets its left and right edges
    // and reads as a base the card sits on rather than a box inside it.
    marginHorizontal: -HERO_PADDING,
    marginTop: Spacing.lg,
    paddingHorizontal: HERO_PADDING,
    paddingVertical: Spacing.md,
  },
  stat: {
    flex: 1,
    gap: 2,
  },
  statLabel: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  /**
   * Edge to edge like the footer strip above it, so the card ends on a band of
   * colour rather than on a boxed-in notice. Its own tint is the tone's soft
   * fill, which the card's radius clips into rounded bottom corners.
   */
  supply: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginHorizontal: -HERO_PADDING,
    paddingHorizontal: HERO_PADDING,
    paddingVertical: Spacing.md,
  },
  supplyIcon: {
    width: 32,
    height: 32,
    borderRadius: Radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  supplyCopy: {
    flex: 1,
    gap: 2,
  },
  // A rule between the halves rather than a gap: the two numbers are unrelated,
  // and whitespace alone lets the eye read them as one phrase.
  footerRule: {
    width: StyleSheet.hairlineWidth,
    marginHorizontal: Spacing.md,
  },
  emptyArt: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  unsupportedNote: {
    marginTop: Spacing.lg,
    // `heroCard` leaves its bottom padding to the footer strip, and this branch
    // has no footer — so the last line pays it back itself.
    marginBottom: HERO_PADDING,
  },
  // Right-aligned so the amount ends on the card's margin, in line with the
  // right-hand stat in the footer strip below it.
  balanceBlock: {
    alignItems: "flex-end",
  },
  notice: {
    marginTop: Spacing.md,
  },
  gap: {
    marginTop: Spacing.xs,
  },
  cta: {
    marginTop: Spacing.lg,
  },
});
