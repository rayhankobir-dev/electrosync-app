import {
  BatteryCharging02Icon,
  ChartHistogramIcon,
  DashboardSpeed01Icon,
} from "@hugeicons/core-free-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Children, Fragment, useMemo, useState, type ReactNode } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";

import { isApiError } from "@/api/errors";
import type { MeterType } from "@/api/types";
import { BackButton } from "@/components/back-button";
import { MeterArtwork } from "@/components/meter-artwork";
import { MeterInfoCard } from "@/components/meter-info-card";
import { NotificationBell } from "@/components/notification-bell";
import { ProviderMark } from "@/components/provider-mark";
import { Badge } from "@/components/ui/badge";
import { Banner } from "@/components/ui/banner";
import { Card, CardPadding } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Screen } from "@/components/ui/screen";
import { Tabs, type TabOption } from "@/components/ui/tabs";
import { Text } from "@/components/ui/text";
import {
  estimateRunwayDays,
  monthlyDailyRate,
  RUNWAY_MAX_DAYS,
  useBalanceRunway,
} from "@/hooks/use-analytics";
import { useMeters } from "@/hooks/use-meters";
import {
  useConsumption,
  useCustomerInfo,
  useRecharges,
} from "@/hooks/use-utility-data";
import { portalMonthNumber, useI18n } from "@/i18n";
import { Spacing, useTheme } from "@/theme";
import type { UtilityMonthlyConsumption, UtilityRecharge } from "@/utility";
import { utilityFor } from "@/utility";

type Tab = "recharges" | "consumption" | "info";

const TABS: readonly Tab[] = ["recharges", "consumption", "info"];

function isTab(value: unknown): value is Tab {
  return (
    typeof value === "string" && (TABS as readonly string[]).includes(value)
  );
}

export default function MeterDetailScreen() {
  /**
   * `tab` lets a caller open this screen on a section other than the first —
   * the home screen's quick actions land straight on recharges, consumption or
   * info. Validated rather than cast: it arrives from a URL, so it is a string
   * from outside the app's control and an unrecognised one has to fall back
   * instead of leaving `Tabs` with a value none of its options match.
   */
  const { id, tab: requestedTab } = useLocalSearchParams<{
    id: string;
    tab?: string;
  }>();
  const router = useRouter();
  const { t } = useI18n();
  const { colors } = useTheme();

  const { data: meters } = useMeters();
  const meter = meters?.find((m) => m.id === id) ?? null;

  // Initial state only. Once the screen is open the segmented control owns the
  // value, so re-reading the param would fight the user's own taps.
  const [tab, setTab] = useState<Tab>(
    isTab(requestedTab) ? requestedTab : "recharges",
  );

  const info = useCustomerInfo(meter);
  const recharges = useRecharges(meter);
  const consumption = useConsumption(meter);

  const tabOptions: readonly TabOption<Tab>[] = [
    {
      value: "recharges",
      label: t("details.recharges"),
      icon: BatteryCharging02Icon,
    },
    {
      value: "consumption",
      label: t("details.consumption"),
      icon: ChartHistogramIcon,
    },
    {
      value: "info",
      label: t("details.info"),
      icon: DashboardSpeed01Icon,
    },
  ];

  if (!meter) {
    return (
      <Screen>
        <Banner message={t("errors.notFound")} />
      </Screen>
    );
  }

  const utility = utilityFor(meter.provider);

  return (
    <Screen edgeToEdgeBottom={false} bottomGutter={false}>
      <View style={styles.topBar}>
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            gap: Spacing.md,
          }}
        >
          {/*
            The same button `ScreenHeader` uses, so this page's arrow does not
            read as a bare glyph next to every other screen's. A push rather than
            `back()` is deliberate and unchanged — see `BackButton`.

            No alignment style: this row centres its children, unlike the
            header's, which pins them to the top and has to do the arithmetic.
          */}
          <BackButton onPress={() => router.push("/(app)/meters")} />
          <ProviderMark provider={meter.provider} size={42} />
          <View style={styles.topTitle}>
            <Text variant="title3" numberOfLines={1}>
              {meter.label ?? info.data?.name ?? meter.customerNo}
            </Text>
            <Text
              variant="caption"
              color="textTertiary"
              numeric
              numberOfLines={1}
              style={styles.topSubtitle}
            >
              {meter.customerNo}
            </Text>
          </View>
        </View>

        <NotificationBell />
      </View>

      {!utility.supported ? (
        <Banner
          tone="info"
          message={t("meters.unsupportedBody", {
            utility: t(utility.nameKey),
          })}
        />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          // Index 1 among this ScrollView's direct children — the tab bar. The
          // three children are fixed in number, so the index cannot drift: the
          // panel below is one element either way.
          stickyHeaderIndices={[1]}
        >
          <BalanceRing
            balance={info.data?.currentBalance ?? null}
            recharges={recharges.data ?? []}
            loading={info.isPending}
            meterType={meter.type}
            meterId={meter.id}
            // Already loaded for the consumption tab, so the runway's fallback
            // rate rides along on a query this screen was fetching anyway.
            consumption={consumption.data ?? []}
          />

          <View
            style={[styles.stickyTabs, { backgroundColor: colors.background }]}
          >
            <Tabs<Tab> options={tabOptions} value={tab} onChange={setTab} />
          </View>

          {tab === "recharges" ? (
            <RechargesPanel query={recharges} />
          ) : tab === "consumption" ? (
            <ConsumptionPanel query={consumption} />
          ) : (
            <InfoPanel query={info} />
          )}
        </ScrollView>
      )}
    </Screen>
  );
}

/**
 * Days that fill the runway ring completely.
 *
 * A recharge cycle, not `RUNWAY_MAX_DAYS`. The question a prepaid user is
 * actually asking is "does this see me through the month", so a month is the
 * span the arc has to be read against — against 90 days a perfectly healthy
 * three-week runway would draw a nearly empty ring and say something alarming
 * that is not true. Runways longer than this clamp to a full ring inside
 * `ProgressRing`, which is the honest reading: past a month, exactly how far
 * past stops changing what you would do about it.
 */
const RUNWAY_RING_DAYS = 30;

function BalanceRing({
  balance,
  recharges,
  loading,
  meterType,
  meterId,
  consumption,
}: {
  balance: number | null;
  recharges: readonly UtilityRecharge[];
  loading: boolean;
  meterType: MeterType;
  /** For the runway query, which is per meter rather than per account. */
  meterId: string;
  /** Stands in for the sampled burn rate until the sweep has enough history. */
  consumption: readonly UtilityMonthlyConsumption[];
}) {
  const { t, formatCurrency, formatNumber } = useI18n();
  const { colors } = useTheme();
  const reference = useMemo(() => {
    const latest = [...recharges].sort(
      (a, b) => b.rechargedDate - a.rechargedDate,
    )[0];
    return latest?.usableAmount ?? null;
  }, [recharges]);

  const fraction =
    balance !== null && reference !== null && reference > 0
      ? balance / reference
      : null;

  const tone =
    balance !== null && balance < 100
      ? "danger"
      : fraction !== null && fraction < 0.25
        ? "warning"
        : "primary";

  /**
   * Reads the same 28-day query as the weekly rhythm card and the home hero, so
   * this adds no request of its own — React Query hands all three one instance.
   */
  const runway = useBalanceRunway(balance, meterId);

  /**
   * The sampled rate when we have one, the portal's monthly average when we do
   * not.
   *
   * Not a tidier `??` over the day counts, because the two differ in more than
   * value: only the fallback is an estimate, and the ring has to say so. Falling
   * back on the *rate* keeps one runway calculation and one place that decides
   * which source answered.
   */
  const fallbackRate = monthlyDailyRate(consumption, new Date());
  const estimated = runway.days === null && fallbackRate !== null;
  const runwayDays = runway.days ?? estimateRunwayDays(balance, fallbackRate);

  /**
   * Urgency in days, which is not the same judgement the balance ring makes.
   * ৳340 is a comfortable balance on a one-room flat and two days of light
   * industry, and the runway is the only figure here that knows the difference —
   * so it takes its colour from what it measures rather than inheriting `tone`.
   */
  const runwayTone =
    runwayDays === null
      ? "textTertiary"
      : runwayDays <= 2
        ? "danger"
        : runwayDays < 7
          ? "warning"
          : "primary";

  return (
    <Card>
      <View style={styles.ringRow}>
        {/* Only the percentage goes inside the circle. A currency string is
            long enough to overflow a fixed-diameter ring and get clipped, so
            the balance itself lives beside it where it can wrap. */}
        <ProgressRing
          value={fraction ?? 0}
          color={tone}
          size={70}
          thickness={9}
        >
          {loading ? (
            <ActivityIndicator />
          ) : fraction !== null ? (
            <Text
              variant="title3"
              numeric
              color={tone === "primary" ? "text" : tone}
            >
              {Math.round(fraction * 100)}%
            </Text>
          ) : (
            <MeterArtwork type={meterType} size={48} />
          )}
        </ProgressRing>

        <View style={styles.ringMeta}>
          <Text variant="caption" color="textTertiary">
            {t("home.balance").toUpperCase()}
          </Text>
          {/* No `adjustsFontSizeToFit`: it shrinks the glyphs but not the
              explicit line height every `Text` here carries, and the result is
              a figure clipped along its top edge. This column has room for a
              seven-figure balance at full size, and may wrap beyond that. */}
          <Text
            variant="title1"
            numeric
            color={tone === "primary" ? "text" : tone}
          >
            {balance === null ? "—" : formatCurrency(balance, 0)}
          </Text>
          {fraction !== null ? (
            <Text variant="footnote" color="textSecondary">
              {t("details.ofLastRecharge")}
            </Text>
          ) : null}
        </View>

        {/* The same hairline the summary cells are divided by further down the
            card, so the two readings are separated the way the figures below
            them already are. */}
        <View
          style={[styles.ringDivider, { backgroundColor: colors.border }]}
        />

        {/*
          What is left, read as time rather than as money — the one question the
          balance beside it cannot answer on its own.

          Same diameter and stroke as the balance ring on purpose: these are two
          readings of one meter, not a headline and a footnote, and a smaller
          circle here would rank them.
        */}
        <View style={styles.runwayBlock}>
          {/*
            The eyebrow the balance carries, over the ring rather than beside it —
            a circle has no left edge to hang a label off.

            Only this ring needs one. The balance ring is named by the column
            immediately to its left, so labelling it too would print the same
            word twice in one row. `home.lasts` rather than a `details` key of its
            own: it is the same reading the home footer already calls this, and
            one concept answering to two words across two screens is how they
            drift apart.
          */}
          {/* <Text variant="caption" color="textTertiary" align="center">
            {t("home.lasts").toUpperCase()}
          </Text> */}

          <ProgressRing
            value={runwayDays === null ? 0 : runwayDays / RUNWAY_RING_DAYS}
            color={runwayTone === "textTertiary" ? "primary" : runwayTone}
            size={70}
            thickness={9}
          >
            {runway.isPending && runwayDays === null ? (
              <ActivityIndicator />
            ) : (
              <>
                <Text variant="title3" numeric color={runwayTone}>
                  {runwayDays === null
                    ? "—"
                    : `${estimated ? "~" : ""}${formatNumber(Math.min(runwayDays, RUNWAY_MAX_DAYS))}${runwayDays > RUNWAY_MAX_DAYS ? "+" : ""}`}
                </Text>
                <Text variant="micro" color="textTertiary">
                  {t("details.days")}
                </Text>
              </>
            )}
          </ProgressRing>
        </View>
        <View style={styles.ringMeta}>
          <Text variant="caption" color="textTertiary">
            {t("details.remainDesc").toUpperCase()}
          </Text>

          <Text
            variant="title1"
            numeric
            color={tone === "primary" ? "text" : tone}
          >
            {runwayDays === null
              ? "—"
              : `${estimated ? "~" : ""}${formatNumber(Math.min(runwayDays, RUNWAY_MAX_DAYS))}${runwayDays > RUNWAY_MAX_DAYS ? "+" : ""}`}{" "}
            {t("details.days")}
          </Text>
          {fraction !== null ? (
            <Text variant="footnote" color="textSecondary">
              {t("details.remain")}
            </Text>
          ) : null}
        </View>
      </View>
    </Card>
  );
}

/**
 * All-time, current-month and previous-month recharge totals in one pass.
 *
 * Buckets by the device's local calendar month rather than a rolling 30 days:
 * "this month" has to mean the month the user would name, since that is the
 * period they compare their spending against.
 */
function summariseRecharges(recharges: readonly UtilityRecharge[], now: Date) {
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  // Wraps to December of the previous year on its own. `setMonth(-1)` would do
  // the same, but only by mutating the date we are also reading `now` from.
  const previousMonth = (currentMonth + 11) % 12;
  const previousYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  const buckets = {
    allTime: { amount: 0, count: 0 },
    currentMonth: { amount: 0, count: 0 },
    previousMonth: { amount: 0, count: 0 },
  };

  for (const recharge of recharges) {
    buckets.allTime.amount += recharge.rechargeAmount;
    buckets.allTime.count += 1;
    const date = new Date(recharge.rechargedDate * 1000);
    const year = date.getFullYear();
    const month = date.getMonth();

    const bucket =
      year === currentYear && month === currentMonth
        ? buckets.currentMonth
        : year === previousYear && month === previousMonth
          ? buckets.previousMonth
          : null;

    if (bucket) {
      bucket.amount += recharge.rechargeAmount;
      bucket.count += 1;
    }
  }

  return buckets;
}

function RechargesPanel({ query }: { query: ReturnType<typeof useRecharges> }) {
  const { t, formatCurrency, formatDate } = useI18n();

  const columns: readonly Column<UtilityRecharge>[] = [
    {
      key: "date",
      header: t("details.columns.date"),
      width: 108,
      align: "left",
      render: (row) => (
        <Text variant="footnote" numeric numberOfLines={1}>
          {formatDate(row.rechargedDate)}
        </Text>
      ),
    },
    {
      key: "amount",
      header: t("details.columns.amount"),
      width: 92,
      render: (row) => (
        <Text variant="footnote" numeric align="center">
          {formatCurrency(row.rechargeAmount, 0)}
        </Text>
      ),
    },
    {
      key: "usable",
      header: t("details.columns.usable"),
      width: 92,
      render: (row) => (
        <Text variant="footnote" numeric align="center" color="success">
          {formatCurrency(row.usableAmount, 0)}
        </Text>
      ),
    },
    {
      key: "method",
      header: t("details.columns.method"),
      width: 90,
      render: (row) => (
        <Text variant="footnote" color="textSecondary" numberOfLines={1}>
          {row.rechargeMethod}
        </Text>
      ),
    },
    {
      key: "status",
      header: t("details.columns.status"),
      width: 84,
      render: (row) => (
        <Badge
          label={row.rechargeStatus}
          align="center"
          tone={
            row.rechargeStatus.toLowerCase() === "success"
              ? "success"
              : "warning"
          }
        />
      ),
    },
  ];

  const totals = summariseRecharges(query.data ?? [], new Date());

  return (
    <PanelShell query={query}>
      <Card style={styles.panel}>
        <SummaryGrid>
          <SummaryCell
            label={t("details.allTime")}
            value={formatCurrency(totals.allTime.amount, 0)}
            // count={formatNumber(totals.allTime.count)}
          />
          <SummaryCell
            label={t("details.thisMonth")}
            value={formatCurrency(totals.currentMonth.amount, 0)}
            // count={formatNumber(totals.currentMonth.count)}
          />
          <SummaryCell
            label={t("details.lastMonth")}
            value={formatCurrency(totals.previousMonth.amount, 0)}
            // count={formatNumber(totals.previousMonth.count)}
          />
        </SummaryGrid>
        <DataTable
          columns={columns}
          rows={query.data ?? []}
          keyExtractor={(row) => `${row.sn}-${row.rechargedDate}`}
          emptyLabel={t("details.noRecharges")}
          bleed={CardPadding}
        />
      </Card>
    </PanelShell>
  );
}

function ConsumptionPanel({
  query,
}: {
  query: ReturnType<typeof useConsumption>;
}) {
  const { t, formatCurrency, formatNumber, formatYear, localizePortalMonth } =
    useI18n();

  const rows = query.data ?? [];
  // Bars are relative to the heaviest month in the set, which makes the
  // comparison readable without inventing an absolute scale.
  const peak = rows.reduce((max, row) => Math.max(max, row.totalUsageInKwh), 0);

  const columns: readonly Column<UtilityMonthlyConsumption>[] = [
    {
      key: "month",
      header: t("details.columns.month"),
      width: 104,
      // Matches the recharge table's leading column: both tables start their
      // rows on the same left edge.
      align: "left",
      render: (row) => (
        <View style={styles.monthCell}>
          <Text variant="footnote" numberOfLines={1}>
            {localizePortalMonth(row.month)}
          </Text>
          <Text variant="caption" color="textTertiary" numeric>
            {formatYear(row.year)}
          </Text>
        </View>
      ),
    },
    {
      key: "usage",
      header: `${t("details.columns.units")}`,
      width: 80,
      render: (row) => (
        <View style={styles.usageCell}>
          <Text variant="footnote" numeric>
            {formatNumber(row.totalUsageInKwh, 1)}
          </Text>
          <ProgressBar
            value={peak > 0 ? row.totalUsageInKwh / peak : 0}
            color={row.totalUsageInKwh >= peak ? "warning" : "primary"}
          />
        </View>
      ),
    },
    {
      key: "charge",
      header: t("details.columns.charge"),
      width: 96,
      render: (row) => (
        <Text variant="footnote" numeric align="center">
          {formatCurrency(row.totalUsageAmount, 0)}
        </Text>
      ),
    },
    {
      key: "closing",
      header: t("details.columns.closing"),
      width: 96,
      render: (row) => (
        <Text
          variant="footnote"
          numeric
          align="center"
          color={row.remainingMeterBalance < 100 ? "danger" : "textSecondary"}
        >
          {formatCurrency(row.remainingMeterBalance, 0)}
        </Text>
      ),
    },
  ];

  const months = rows.length;
  const avgUnits =
    months > 0
      ? rows.reduce((sum, row) => sum + row.totalUsageInKwh, 0) / months
      : 0;
  const avgSpend =
    months > 0
      ? rows.reduce((sum, row) => sum + row.totalUsageAmount, 0) / months
      : 0;

  /**
   * The newest row by (year, month) rather than `rows[0]` or the last element:
   * neither the endpoint nor the hook promises an order, and the month arrives
   * as a Bangla word, so it has to be mapped to a number before it can be
   * compared. A row whose month the portal spells unexpectedly ranks at the
   * bottom of its year instead of throwing off the whole comparison.
   */
  const latest = rows.reduce<UtilityMonthlyConsumption | null>((best, row) => {
    if (!best) return row;
    const rank = (r: UtilityMonthlyConsumption) =>
      r.year * 12 + (portalMonthNumber(r.month) ?? 0);
    return rank(row) > rank(best) ? row : best;
  }, null);

  return (
    <PanelShell query={query}>
      <Card style={styles.panel}>
        <SummaryGrid>
          <SummaryCell
            label={t("details.avgSpend")}
            value={formatCurrency(avgSpend, 0)}
          />
          <SummaryCell
            label={t("details.avgUnits")}
            value={`${formatNumber(avgUnits, 1)} ${t("details.kwh")}`}
          />
          <SummaryCell
            label={t("details.lastClosing")}
            value={
              latest === null
                ? "—"
                : formatCurrency(latest.remainingMeterBalance, 0)
            }
            // Same threshold the table's closing column uses, so a low balance
            // reads the same whether you scan the summary or the rows.
            tone={
              latest !== null && latest.remainingMeterBalance < 100
                ? "danger"
                : "text"
            }
          />
        </SummaryGrid>

        <DataTable
          columns={columns}
          rows={rows}
          keyExtractor={(row) => `${row.year}-${row.month}`}
          emptyLabel={t("details.noConsumption")}
          bleed={CardPadding}
        />
      </Card>
    </PanelShell>
  );
}

function InfoPanel({ query }: { query: ReturnType<typeof useCustomerInfo> }) {
  return (
    <PanelShell query={query}>
      {query.data ? <MeterInfoCard info={query.data} /> : null}
    </PanelShell>
  );
}

function PanelShell({
  query,
  children,
}: {
  query: { isPending: boolean; isError: boolean; error: unknown };
  children: React.ReactNode;
}) {
  const { t } = useI18n();

  if (query.isPending) {
    return (
      <Card style={styles.panel}>
        <ActivityIndicator />
      </Card>
    );
  }

  if (query.isError) {
    return (
      <View style={styles.panel}>
        <Banner
          message={t(
            isApiError(query.error) ? query.error.messageKey : "errors.unknown",
          )}
        />
      </View>
    );
  }

  return <>{children}</>;
}

/**
 * The row `SummaryCell`s sit in, with a hairline rule dropped between each pair.
 *
 * Interleaved here rather than written into the call sites, so a fourth figure
 * cannot be added without its separator; and drawn as its own element rather
 * than as a border on the cell, so the rule lands in the middle of the gutter
 * instead of hard against the next cell's text.
 */
function SummaryGrid({ children }: { children: ReactNode }) {
  const { colors } = useTheme();

  return (
    <View style={styles.summaryGrid}>
      {Children.toArray(children).map((cell, index) => (
        <Fragment key={index}>
          {index > 0 ? (
            <View
              style={[
                styles.summaryDivider,
                { backgroundColor: colors.border },
              ]}
            />
          ) : null}
          {cell}
        </Fragment>
      ))}
    </View>
  );
}

/**
 * One figure in the consumption summary grid. Three of these share a row, so
 * the label wraps rather than truncating — 'গত মাসের অবশিষ্ট' will not fit a
 * third of a phone's width on one line, and a clipped label is worse than a
 * two-line one.
 */
function SummaryCell({
  label,
  value,
  count,
  tone = "text",
}: {
  label: string;
  value: string;
  /** Secondary figure under the value — how many entries it was drawn from. */
  count?: string;
  tone?: "text" | "danger";
}) {
  return (
    <View style={styles.summaryCell}>
      {/*
        Centred per line, not per block: `alignItems` on the cell would centre a
        wrapped label as one shape and leave its second line hugging the left
        edge. These labels do wrap — see above — so the alignment has to live on
        the text.
      */}
      <Text variant="caption" color="textTertiary" align="center">
        {label.toUpperCase()}
      </Text>
      <Text variant="bodyMedium" numeric color={tone} align="center">
        {value}
      </Text>
      {count ? (
        <Text variant="footnote" color="textTertiary" numeric align="center">
          {count}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: Spacing.lg,
  },
  topTitle: {
    flex: 1,
  },
  topSubtitle: {
    marginTop: -4.5,
  },
  content: {
    gap: Spacing.lg,
    paddingBottom: Spacing["2xl"],
  },
  stickyTabs: {
    paddingBottom: Spacing.sm,
  },
  ringRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.lg,
  },
  ringMeta: {
    flex: 1,
    gap: 2,
  },
  runwayBlock: {
    // The ring is a fixed 70 wide, so the label centres over it rather than the
    // label's own width deciding where the circle sits.
    alignItems: "center",
    // Matches the gap between the balance's own eyebrow and its figure, so the
    // two labels sit the same distance from what they name.
    gap: 2,
  },
  ringDivider: {
    width: StyleSheet.hairlineWidth,
    /**
     * Overrides the row's `alignItems: "center"`, so the rule runs the height of
     * the tallest thing beside it — the rings — rather than collapsing to no
     * height at all. Same shape as `summaryDivider`; kept separate because the
     * two live in rows with different alignment and would fight over it.
     */
    alignSelf: "stretch",
  },
  panel: {
    gap: Spacing.lg,
  },
  summaryGrid: {
    flexDirection: "row",
    // Half the old gutter, applied either side of the rule, so introducing the
    // rule costs each cell about a pixel rather than a dozen. These labels
    // already wrap to two lines at three-to-a-row and have no width to spare.
    gap: Spacing.sm,
  },
  summaryDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: "stretch",
  },
  summaryCell: {
    flex: 1,
    flexBasis: 0,
    gap: 2,
  },
  usageCell: {
    alignSelf: "stretch",
    alignItems: "center",
    gap: Spacing.xs,
  },
  /** Stacked month-over-year, left-aligned as one block under its header. */
  monthCell: {
    alignItems: "flex-start",
  },
});
