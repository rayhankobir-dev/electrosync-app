import {
  ArrowLeft01Icon,
  BatteryCharging02Icon,
  ChartHistogramIcon,
  DashboardSpeed01Icon,
} from "@hugeicons/core-free-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Children, Fragment, useMemo, useState, type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { isApiError } from "@/api/errors";
import type { MeterType } from "@/api/types";
import { MeterArtwork } from "@/components/meter-artwork";
import { MeterInfoCard } from "@/components/meter-info-card";
import { NotificationBell } from "@/components/notification-bell";
import { ProviderMark } from "@/components/provider-mark";
import { Badge } from "@/components/ui/badge";
import { Banner } from "@/components/ui/banner";
import { Card, CardPadding } from "@/components/ui/card";
import { DataTable, type Column } from "@/components/ui/data-table";
import { Icon } from "@/components/ui/icon";
import { ProgressBar } from "@/components/ui/progress-bar";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Screen } from "@/components/ui/screen";
import { Tabs, type TabOption } from "@/components/ui/tabs";
import { Text } from "@/components/ui/text";
import { useMeters } from "@/hooks/use-meters";
import {
  useConsumption,
  useCustomerInfo,
  useRecharges,
} from "@/hooks/use-utility-data";
import { portalMonthNumber, useI18n } from "@/i18n";
import { HitSlop, Spacing, useTheme } from "@/theme";
import type { UtilityMonthlyConsumption, UtilityRecharge } from "@/utility";
import { utilityFor } from "@/utility";

type Tab = "recharges" | "consumption" | "info";

const TABS: readonly Tab[] = ["recharges", "consumption", "info"];

function isTab(value: unknown): value is Tab {
  return typeof value === "string" && (TABS as readonly string[]).includes(value);
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
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("common.back")}
            hitSlop={HitSlop / 4}
            onPress={() => router.push("/(app)/meters")}
          >
            <Icon icon={ArrowLeft01Icon} color="textSecondary" />
          </Pressable>
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

function BalanceRing({
  balance,
  recharges,
  loading,
  meterType,
}: {
  balance: number | null;
  recharges: readonly UtilityRecharge[];
  loading: boolean;
  meterType: MeterType;
}) {
  const { t, formatCurrency } = useI18n();
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

  return (
    <Card>
      <View style={styles.ringRow}>
        {/* Only the percentage goes inside the circle. A currency string is
            long enough to overflow a fixed-diameter ring and get clipped, so
            the balance itself lives beside it where it can wrap. */}
        <ProgressRing
          value={fraction ?? 0}
          color={tone}
          size={104}
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
      <Text variant="caption" color="textTertiary">
        {label.toUpperCase()}
      </Text>
      <Text variant="bodyMedium" numeric color={tone}>
        {value}
      </Text>
      {count ? (
        <Text variant="footnote" color="textTertiary" numeric>
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
