import { RefreshIcon } from "@hugeicons/core-free-icons";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import { isApiError } from "@/api/errors";
import type { Meter } from "@/api/types";
import { MeterArtwork } from "@/components/meter-artwork";
import { MeterInfoCard } from "@/components/meter-info-card";
import { useMeterForm } from "@/components/meter-form-host";
import { ScreenHeader } from "@/components/screen-header";
import { Badge } from "@/components/ui/badge";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Screen } from "@/components/ui/screen";
import { Text } from "@/components/ui/text";
import { UsageTrendCard } from "@/components/usage-trend-card";
import { WeeklyRhythmCard } from "@/components/weekly-rhythm-card";
import { usePrimaryMeter } from "@/hooks/use-meters";
import { useCustomerInfo } from "@/hooks/use-utility-data";
import { useI18n } from "@/i18n";
import { useSession } from "@/session";
import { HitSlop, Spacing, useTheme } from "@/theme";
import { utilityFor } from "@/utility";

export default function HomeScreen() {
  const { t } = useI18n();
  const { user } = useSession();
  const { meter, isLoading } = usePrimaryMeter();

  return (
    <Screen edgeToEdgeBottom={false}>
      <ScreenHeader title={t("home.greeting", { name: user?.name ?? "" })} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {isLoading ? (
          <Card>
            <ActivityIndicator />
          </Card>
        ) : meter ? (
          <MeterDashboard meter={meter} />
        ) : (
          <NoMeter />
        )}
      </ScrollView>
    </Screen>
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
  const { t, formatCurrency } = useI18n();
  const { colors } = useTheme();
  const utility = utilityFor(meter.provider);

  // `info` carries `currentBalance`, so there is no separate balance request —
  // these routes are live portal scrapes and one page should be fetched once.
  const info = useCustomerInfo(meter);

  if (!utility.supported) {
    return (
      <Card>
        <View style={styles.meterHead}>
          <MeterArtwork type={meter.type} size={64} />
          <View style={styles.meterTitle}>
            <Text variant="title3" numberOfLines={1}>
              {meter.label ?? meter.customerNo}
            </Text>
            <Text variant="footnote" color="textTertiary" numeric>
              {meter.customerNo}
            </Text>
          </View>
          <Badge label={utility.displayName} tone="warning" />
        </View>
        <Text
          variant="callout"
          color="textSecondary"
          style={styles.unsupportedNote}
        >
          {t("meters.unsupportedBody", { utility: utility.displayName })}
        </Text>
      </Card>
    );
  }

  const refreshing = info.isFetching;

  return (
    <View style={styles.stack}>
      <Card>
        <View style={styles.meterHead}>
          <MeterArtwork type={meter.type} size={64} />

          <View style={styles.meterTitle}>
            <Text variant="title3" numberOfLines={1}>
              {meter.label ?? meter.customerNo}
            </Text>
            <Text variant="footnote" color="textTertiary" numeric>
              {meter.customerNo}
            </Text>
          </View>

          <View style={styles.headActions}>
            <Badge label={utility.displayName} />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("common.retry")}
              hitSlop={HitSlop / 4}
              disabled={refreshing}
              onPress={() => void info.refetch()}
            >
              {refreshing ? (
                <ActivityIndicator size="small" color={colors.textTertiary} />
              ) : (
                <Icon icon={RefreshIcon} size={20} color="textTertiary" />
              )}
            </Pressable>
          </View>
        </View>

        <View style={styles.balanceBlock}>
          <Text variant="caption" color="textTertiary">
            {t("home.balance").toUpperCase()}
          </Text>

          {info.isPending ? (
            <ActivityIndicator style={styles.gap} />
          ) : info.isError ? (
            <Banner
              message={t(
                isApiError(info.error)
                  ? info.error.messageKey
                  : "errors.unknown",
              )}
            />
          ) : (
            <Text
              variant="display"
              numeric
              color={info.data.currentBalance < 100 ? "danger" : "text"}
            >
              {formatCurrency(info.data.currentBalance)}
            </Text>
          )}
        </View>
      </Card>

      {/*
        Both cards read from `/analytics/usage`, which serves stored samples
        rather than scraping the portal — so they render immediately and do not
        wait on `info`. The rhythm card returns null until it has enough
        history to draw a pattern worth believing.
      */}
      <UsageTrendCard meterId={meter.id} />
      <WeeklyRhythmCard meterId={meter.id} />

      {info.isSuccess ? <MeterInfoCard info={info.data} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: Spacing.lg,
    paddingBottom: Spacing["2xl"],
  },
  stack: {
    gap: Spacing.lg,
  },
  meterHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  meterTitle: {
    flex: 1,
    gap: 2,
  },
  emptyArt: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  unsupportedNote: {
    marginTop: Spacing.lg,
  },
  headActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  balanceBlock: {
    marginTop: Spacing.xl,
    gap: Spacing.xs,
  },
  gap: {
    marginTop: Spacing.xs,
  },
  cta: {
    marginTop: Spacing.lg,
  },
});
