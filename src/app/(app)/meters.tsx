import {
  DashboardSpeed01Icon,
  Delete02Icon,
  EyeIcon,
  Location01Icon,
  StarIcon,
} from "@hugeicons/core-free-icons";
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
import {
  ProviderRibbon,
  RIBBON_HEIGHT,
  RibbonBand,
  TypeRibbon,
} from "@/components/card-ribbons";
import { MeterArtwork } from "@/components/meter-artwork";
import { useMeterForm } from "@/components/meter-form-host";
import { ScreenHeader } from "@/components/screen-header";
import { Button, IconButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Screen } from "@/components/ui/screen";
import {
  SkeletonBlock,
  SkeletonGroup,
  SkeletonLine,
  SkeletonTile,
} from "@/components/ui/skeleton";
import { StarFill } from "@/components/ui/star-fill";
import { Text } from "@/components/ui/text";
import { useToast } from "@/components/ui/toast-host";
import { useMeters, useRemoveMeter, useUpdateMeter } from "@/hooks/use-meters";
import { useMeterDetails, type MeterDetail } from "@/hooks/use-utility-data";
import { useI18n } from "@/i18n";
import { Radius, Spacing } from "@/theme";

export default function MetersScreen() {
  const { t } = useI18n();
  const { data: meters, isLoading, refetch, isRefetching } = useMeters();
  const updateMeter = useUpdateMeter();
  const removeMeter = useRemoveMeter();
  const router = useRouter();
  const toast = useToast();

  // The sheet lives above the tab navigator so the bar's action button can open
  // it; this screen only ever asks for the edit variant.
  const meterForm = useMeterForm();

  const details = useMeterDetails(meters ?? []);

  /**
   * No success toast: the star fills the moment the tap lands, which says it
   * worked without a message on top of it. Failure is the case that needs
   * words — the optimistic write rolls back, so all the user would otherwise
   * see is the star quietly un-filling, which reads as a missed tap rather
   * than a rejected one.
   */
  function makePrimary(meter: Meter) {
    void updateMeter
      .mutateAsync({ id: meter.id, isPrimary: true })
      .catch((error: unknown) => {
        toast.error(
          t("meters.makePrimaryFailed"),
          t(isApiError(error) ? error.messageKey : "errors.unknown"),
        );
      });
  }

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
      {/*
        `meters.mine`, not `meters.title`. The tab bar needs the short form —
        a four-tab bar splits the width four ways and "আমার মিটার" would
        truncate in the strip under the icon — while the screen it opens has a
        full line to itself and reads better owning the meters: "My meters".
      */}
      <ScreenHeader title={t("meters.mine")} />

      <FlatList
        data={details}
        keyExtractor={(item) => item.meter.id}
        contentContainerStyle={styles.list}
        onRefresh={() => void refetch()}
        refreshing={isRefetching}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          isLoading ? (
            <MetersSkeleton />
          ) : (
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
            /**
             * The primary meter is protected from removal — promote another one
             * first. Computed here rather than in the card because it is a fact
             * about the list, not about the meter.
             *
             * The single-meter exemption is the part that matters: a lone meter is
             * primary by definition, so keying off `isPrimary` alone would leave
             * an account holding one meter it could never delete, with no other
             * meter to promote in order to unlock it.
             */
            canRemove={!item.meter.isPrimary || details.length === 1}
            onEdit={() => meterForm.edit(item.meter)}
            onMakePrimary={() => makePrimary(item.meter)}
            onRemove={() => confirmRemove(item.meter)}
            onViewDetails={() => router.push(`/meter/${item.meter.id}`)}
          />
        )}
      />
    </Screen>
  );
}

/**
 * What the list looks like before it arrives.
 *
 * Three cards rather than one: the point of a skeleton is to reserve the shape
 * of what is coming, and a single card would collapse to a full list a beat
 * later — the jump is the thing this exists to avoid. Three is a guess at the
 * common case, and guessing slightly low is the safer error: the list growing
 * downward is ordinary, a page of placeholders shrinking is not.
 */
function MetersSkeleton() {
  return (
    <View style={styles.list}>
      {[0, 1, 2].map((index) => (
        <MeterCardSkeleton key={index} />
      ))}
    </View>
  );
}

/** Traces `MeterCard`'s own layout — ribbon band, identity row, action line. */
function MeterCardSkeleton() {
  return (
    <Card style={styles.card}>
      <SkeletonGroup>
        {/* The real band, so the card cannot resize when the ribbons arrive.
            Both tabs are drawn the same width — a placeholder cannot know how
            long "INDUSTRY" is, and guessing would be a claim the layout has to
            take back a moment later. */}
        <RibbonBand padding={CARD_PADDING}>
          <SkeletonBlock width={84} height={RIBBON_HEIGHT} radius={Radius.md} />
          <SkeletonBlock width={84} height={RIBBON_HEIGHT} radius={Radius.md} />
        </RibbonBand>

        <View style={styles.row}>
          <SkeletonTile size={48} />

          <View style={styles.skeletonLines}>
            <SkeletonLine width="62%" height={16} />
            <SkeletonLine width="38%" height={12} />
          </View>

          <SkeletonBlock width={72} height={22} />
        </View>

        <View style={styles.actions}>
          <SkeletonBlock width={44} height={44} radius={Radius.md} />
          <SkeletonBlock width={44} height={44} radius={Radius.md} />
          <SkeletonBlock
            height={44}
            radius={Radius.md}
            style={styles.viewDetails}
          />
        </View>
      </SkeletonGroup>
    </Card>
  );
}

function MeterCard({
  detail,
  canRemove,
  onEdit,
  onMakePrimary,
  onRemove,
  onViewDetails,
}: {
  detail: MeterDetail;
  canRemove: boolean;
  onEdit(): void;
  onMakePrimary(): void;
  onRemove(): void;
  onViewDetails(): void;
}) {
  const { t, formatCurrency } = useI18n();
  const { meter, utility, balance, info } = detail;

  /**
   * The amount only earns its slot on the right when there is an amount to put
   * there. A failed fetch drops out of the row entirely and reports itself at
   * full width underneath instead: the error strings are whole sentences
   * ("Can't reach the server. Check your connection."), and a sentence wrapped
   * into the narrow column beside a two-line address is unreadable.
   */
  const showBalance = utility.supported && !info.isError;

  /**
   * Both things that can stand in for the balance — an unsupported provider and
   * a failed fetch — are a line of explanatory prose under the row, so they are
   * resolved to one value here rather than branching the markup twice.
   */
  const notice = !utility.supported
    ? {
        text: t("meters.unsupportedTitle", { utility: t(utility.nameKey) }),
        color: "warning" as const,
      }
    : info.isError
      ? {
          text: t(
            isApiError(info.error) ? info.error.messageKey : "errors.unknown",
          ),
          color: "danger" as const,
        }
      : null;

  return (
    <Pressable onPress={onEdit}>
      <Card style={styles.card}>
        <RibbonBand padding={CARD_PADDING}>
          <TypeRibbon type={meter.type} />
          <ProviderRibbon provider={meter.provider} />
        </RibbonBand>

        {/*
          One block rather than an identity row with a separate detail section
          below it: the address continues the same left column the customer
          number starts, so all three lines share an edge, and the amount is
          pulled out to the card's right margin opposite them.

          The amount carries no "current balance" caption. On a card that shows
          exactly one figure, in an app about prepaid balances, the currency
          symbol and the size of the type already say what it is — the label was
          a second line of chrome per card for no information.
        */}
        <View style={styles.row}>
          <MeterArtwork type={meter.type} size={48} />

          <View style={styles.rowMain}>
            <Text variant="bodyMedium" numberOfLines={1}>
              {meter.label ?? info.data?.name ?? meter.customerNo}
            </Text>
            {/*
              The same glyph the Meters tab is labelled with, so the number it
              marks reads as "the meter" without a word spent saying so.
            */}
            <View style={styles.metaRow}>
              <Icon
                icon={DashboardSpeed01Icon}
                size={14}
                color="textTertiary"
              />
              <Text
                variant="subhead"
                color="textTertiary"
                numeric
                numberOfLines={1}
                style={styles.flex}
              >
                {meter.customerNo}
              </Text>
            </View>

            {info.data?.address ? (
              <View style={[styles.metaRow, styles.readout]}>
                <Icon
                  icon={Location01Icon}
                  size={14}
                  color="textTertiary"
                />
                {/* `flex: 1` so a long address wraps inside the row instead of
                    pushing the pin off the card's left edge. */}
                <Text
                  variant="footnote"
                  color="textSecondary"
                  numberOfLines={2}
                  style={styles.flex}
                >
                  {info.data.address}
                </Text>
              </View>
            ) : null}
          </View>

          {showBalance ? (
            <View style={styles.balanceBlock}>
              {info.isPending ? (
                <ActivityIndicator size="small" />
              ) : (
                <Text
                  variant="title3"
                  numeric
                  numberOfLines={1}
                  color={balance !== null && balance < 100 ? "danger" : "text"}
                >
                  {balance === null ? "—" : formatCurrency(balance)}
                </Text>
              )}
            </View>
          ) : null}
        </View>

        {notice ? (
          // Scoped to this card: the rest of the list is unaffected.
          <Text variant="footnote" color={notice.color} style={styles.notice}>
            {notice.text}
          </Text>
        ) : null}

        {/*
          Every action on the card on one line: the two that act on the meter
          itself pinned left at a fixed square, the one that opens it given all
          the width that is left. Outside the supported/unsupported split above,
          because a meter on a provider we cannot read yet can still be promoted
          or removed — only "view details" has nothing to show.
        */}
        <View style={styles.actions}>
          <IconButton
            accessibilityLabel={
              meter.isPrimary ? t("meters.primary") : t("meters.makePrimary")
            }
            /**
             * There is always exactly one primary meter, so on that card the
             * button has nothing left to do — it stays put as the filled-star
             * readout of the state it would otherwise set, rather than
             * disappearing and leaving this row a different shape from every
             * other card's.
             */
            disabled={meter.isPrimary}
            // Cancels the disabled dimming: inert here means "already done",
            // not "unavailable", and a greyed star reads as the latter.
            style={meter.isPrimary ? styles.settled : undefined}
            onPress={onMakePrimary}
          >
            {meter.isPrimary ? (
              <StarFill size={20} />
            ) : (
              <Icon icon={StarIcon} size={20} color="textSecondary" />
            )}
          </IconButton>

          <IconButton
            accessibilityLabel={t("meters.remove")}
            accessibilityHint={
              canRemove ? undefined : t("meters.removePrimaryHint")
            }
            disabled={!canRemove}
            onPress={onRemove}
          >
            <Icon
              icon={Delete02Icon}
              size={20}
              color={canRemove ? "danger" : "textTertiary"}
            />
          </IconButton>

          {utility.supported ? (
            <Button
              label={t("meters.viewDetails")}
              variant="secondary"
              size="md"
              icon={EyeIcon}
              onPress={onViewDetails}
              style={styles.viewDetails}
            />
          ) : null}
        </View>
      </Card>
    </Pressable>
  );
}

/**
 * Tighter than the app-wide `CardPadding`. These cards stack down a list where
 * what gets scanned is the name and the balance, so the space around them is
 * what gives rather than the type sizes. Named because the ribbon band has to
 * cancel it out exactly.
 */
const CARD_PADDING = Spacing.md;

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
  card: {
    padding: CARD_PADDING,
  },
  row: {
    flexDirection: "row",
    // Was `center`, which suited a two-line column. Now that the address and
    // the balance label extend it well past the artwork's 48px, centring would
    // float the artwork in the middle of the block; topping it out against the
    // meter's name keeps the two anchored to each other.
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  rowMain: {
    flex: 1,
    gap: 2,
  },
  // Looser than `rowMain`'s 2px. Text lines have leading inside the glyph box;
  // a solid bar has none, so the same gap between bars reads as one thick block.
  skeletonLines: {
    flex: 1,
    gap: Spacing.sm,
  },
  /**
   * The 2px `gap` above holds the name and the customer number together as one
   * identity unit. The address is a separate readout, so it buys back a little
   * air without loosening that pair.
   */
  readout: {
    marginTop: Spacing.xs,
  },
  /**
   * Shared by the meter number and the address: an icon in the tertiary tone,
   * then the line it marks. Centred rather than top-aligned, so the glyph sits
   * on the text's optical middle at either type size without a per-variant
   * offset.
   */
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  flex: {
    flex: 1,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginTop: Spacing.md,
  },
  // `flex: 1` rather than a width: it takes whatever the two squares to its
  // left leave, so the row fills the card at any width.
  viewDetails: {
    flex: 1,
  },
  // Disabled here means "already the primary meter", which is a state worth
  // showing at full strength — see the button's own comment.
  settled: {
    opacity: 1,
  },
  notice: {
    marginTop: Spacing.sm,
  },
  balanceBlock: {
    /**
     * `flex-end` on the cross axis, not `center`: the amount settles on the
     * last line of the column — the address — so it sits on a baseline rather
     * than floating. Centring would park it halfway up an address that may run
     * to one line or two, putting it at a different height on every card in
     * the list.
     */
    alignSelf: "flex-end",
    alignItems: "flex-end",
  },
  emptyArt: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  gap: {
    marginTop: Spacing.xs,
  },
});
