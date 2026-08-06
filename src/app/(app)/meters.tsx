import { Delete02Icon, EyeIcon, StarIcon } from "@hugeicons/core-free-icons";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";

import { isApiError } from "@/api/errors";
import type { Meter } from "@/api/types";
import { MeterArtwork, MeterTypeLabelKey } from "@/components/meter-artwork";
import { useMeterForm } from "@/components/meter-form-host";
import { ScreenHeader } from "@/components/screen-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Screen } from "@/components/ui/screen";
import { Text } from "@/components/ui/text";
import { useMeters, useRemoveMeter, useUpdateMeter } from "@/hooks/use-meters";
import { useMeterDetails, type MeterDetail } from "@/hooks/use-utility-data";
import { useI18n } from "@/i18n";
import { HitSlop, Spacing } from "@/theme";

export default function MetersScreen() {
  const { t } = useI18n();
  const { data: meters, isLoading, refetch, isRefetching } = useMeters();
  const updateMeter = useUpdateMeter();
  const removeMeter = useRemoveMeter();
  const router = useRouter();

  // The sheet lives above the tab navigator so the bar's action button can open
  // it; this screen only ever asks for the edit variant.
  const meterForm = useMeterForm();

  const details = useMeterDetails(meters ?? []);

  function confirmRemove(meter: Meter) {
    const remove = () =>
      void removeMeter.mutateAsync(meter.id).catch(() => undefined);

    // Alert is unimplemented on React Native Web.
    if (Platform.OS === "web") {
      remove();
      return;
    }

    Alert.alert(t("meters.removeConfirm"), meter.label ?? meter.customerNo, [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("common.delete"), style: "destructive", onPress: remove },
    ]);
  }

  return (
    <Screen edgeToEdgeBottom={false}>
      {/* No add button here any more: the action lives in the tab bar, where it
          is reachable from every screen. */}
      <ScreenHeader title={t("meters.title")} />

      <FlatList
        data={details}
        keyExtractor={(item) => item.meter.id}
        contentContainerStyle={styles.list}
        onRefresh={() => void refetch()}
        refreshing={isRefetching}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          isLoading ? null : (
            <Card>
              <View style={styles.emptyArt}>
                <MeterArtwork type="HOME" size={96} />
              </View>
              <Text variant="title3" align="center">
                {t("meters.emptyTitle")}
              </Text>
              <Text
                variant="callout"
                color="textSecondary"
                align="center"
                style={styles.gap}
              >
                {t("meters.emptyBody")}
              </Text>
            </Card>
          )
        }
        renderItem={({ item }) => (
          <MeterCard
            detail={item}
            onEdit={() => meterForm.edit(item.meter)}
            onMakePrimary={() =>
              void updateMeter
                .mutateAsync({ id: item.meter.id, isPrimary: true })
                .catch(() => undefined)
            }
            onRemove={() => confirmRemove(item.meter)}
            onViewDetails={() => router.push(`/meter/${item.meter.id}`)}
          />
        )}
      />
    </Screen>
  );
}

function MeterCard({
  detail,
  onEdit,
  onMakePrimary,
  onRemove,
  onViewDetails,
}: {
  detail: MeterDetail;
  onEdit(): void;
  onMakePrimary(): void;
  onRemove(): void;
  onViewDetails(): void;
}) {
  const { t, formatCurrency } = useI18n();
  const { meter, utility, balance, info } = detail;

  return (
    // The primary badge hangs over the card's top edge, and `Card` clips to its
    // radius — so the badge is a sibling of the card rather than a child, and
    // the wrapper reserves the strip it needs above. Reserved whether or not
    // this card is the primary one, so the gaps down the list stay even.
    <Pressable onPress={onEdit} style={styles.cardWrap}>
      <Card>
        <View style={styles.row}>
          <MeterArtwork type={meter.type} size={56} />

          <View style={styles.rowMain}>
            <Text variant="bodyMedium" numberOfLines={1}>
              {meter.label ?? info.data?.name ?? meter.customerNo}
            </Text>
            <Text variant="footnote" color="textTertiary" numeric>
              {meter.customerNo}
            </Text>

            <View style={styles.badges}>
              <Badge
                label={utility.displayName}
                tone={utility.supported ? "neutral" : "warning"}
              />
              <Badge label={t(MeterTypeLabelKey[meter.type])} />
            </View>
          </View>

          <View style={styles.actions}>
            {!meter.isPrimary ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("meters.makePrimary")}
                hitSlop={HitSlop / 4}
                onPress={onMakePrimary}
              >
                <Icon icon={StarIcon} size={20} color="textTertiary" />
              </Pressable>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("meters.remove")}
              hitSlop={HitSlop / 4}
              onPress={onRemove}
            >
              <Icon icon={Delete02Icon} size={20} color="danger" />
            </Pressable>
          </View>
        </View>

        {utility.supported ? (
          <View style={styles.detail}>
            {info.data?.address ? (
              <Text variant="footnote" color="textSecondary" numberOfLines={2}>
                {info.data.address}
              </Text>
            ) : null}

            <View style={styles.balanceRow}>
              <Text variant="caption" color="textTertiary">
                {t("home.balance").toUpperCase()}
              </Text>

              {info.isPending ? (
                <ActivityIndicator size="small" />
              ) : info.isError ? (
                // Scoped to this card: the rest of the list is unaffected.
                <Text variant="subhead" color="danger">
                  {t(
                    isApiError(info.error)
                      ? info.error.messageKey
                      : "errors.unknown",
                  )}
                </Text>
              ) : (
                <Text
                  variant="title3"
                  numeric
                  color={balance !== null && balance < 100 ? "danger" : "text"}
                >
                  {balance === null ? "—" : formatCurrency(balance)}
                </Text>
              )}
            </View>

            <Button
              label={t("meters.viewDetails")}
              variant="secondary"
              size="md"
              icon={EyeIcon}
              onPress={onViewDetails}
            />
          </View>
        ) : (
          <Text variant="footnote" color="warning" style={styles.detail}>
            {t("meters.unsupportedTitle", { utility: utility.displayName })}
          </Text>
        )}
      </Card>

      {/* After the card, not before it: siblings paint in order, so a badge
          declared first would end up underneath. */}
      {meter.isPrimary ? (
        // Inert, so a tap on the badge still opens the card for editing.
        <View style={styles.primaryBadge} pointerEvents="none">
          <Badge label={t("meters.primary")} tone="primary" />
        </View>
      ) : null}
    </Pressable>
  );
}

/**
 * Half a badge: `caption` is 16pt of line height plus 2pt of padding top and
 * bottom. The badge sits at the top of this strip and the card starts below it,
 * so the two overlap by exactly this much and the pill straddles the edge.
 * (Bangla's taller line height overlaps a little further, which is fine — the
 * badge is anchored to the strip, so nothing can be clipped either way.)
 */
const PRIMARY_BADGE_OVERHANG = 10;

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  list: {
    gap: Spacing.md,
    paddingBottom: Spacing["2xl"],
  },
  cardWrap: {
    paddingTop: PRIMARY_BADGE_OVERHANG,
  },
  primaryBadge: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    // A centred row rather than `alignItems: 'center'`: `Badge` sets
    // `alignSelf: 'flex-start'` on itself, which would beat a parent's
    // cross-axis alignment but says nothing about the main axis.
    flexDirection: "row",
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  rowMain: {
    flex: 1,
    gap: 2,
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.lg,
  },
  detail: {
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  emptyArt: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  gap: {
    marginTop: Spacing.xs,
  },
});
