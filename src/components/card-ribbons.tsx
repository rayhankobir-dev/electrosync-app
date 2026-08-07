import { Image } from "expo-image";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import type { MeterProvider, MeterType } from "@/api/types";
import { MeterTypeIcon, MeterTypeLabelKey } from "@/components/meter-artwork";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useI18n } from "@/i18n";
import { Radius, Spacing, useTheme } from "@/theme";
import { utilityFor } from "@/utility";

/**
 * Fixed rather than left to the text: `captionStrong` is 16pt of line height in
 * Latin and a shade more in Bangla, and a ribbon is a corner tab whose depth
 * should not change with the language. 28pt clears both with the label centred,
 * and holds every ribbon to the same depth as its neighbour.
 */
export const RIBBON_HEIGHT = 28;

/**
 * Sized to the ribbon it sits in rather than to the type beside it: 18pt leaves
 * 5pt of ribbon above and below the chip, which is what keeps the mark reading
 * as inset in the tab instead of filling it.
 */
const LOGO = 18;

/**
 * The strip of tabs across the top of a card.
 *
 * A band rather than absolutely positioned tabs: `Card` clips to its radius and
 * pads its children, so an absolute ribbon would sit a full pad short of the
 * corner. Cancelling the padding with a matching negative margin — the case
 * `CardPadding` is exported for — puts each ribbon flush in its corner and keeps
 * it clear of the text below instead of overlapping it.
 *
 * `padding` is the host card's own, which the caller knows and this does not.
 */
export function RibbonBand({
  children,
  padding,
}: {
  children: ReactNode;
  padding: number;
}) {
  return (
    <View
      style={[
        styles.band,
        {
          marginTop: -padding,
          marginHorizontal: -padding,
          marginBottom: padding,
        },
      ]}
    >
      {children}
    </View>
  );
}

/** Left tab: what the meter is for. Square where it meets the card's body. */
export function TypeRibbon({ type }: { type: MeterType }) {
  const { t } = useI18n();
  const { colors } = useTheme();

  return (
    <View style={[styles.tab, styles.left, { backgroundColor: colors.surfacePressed }]}>
      <Icon icon={MeterTypeIcon[type]} size={14} color="textSecondary" />
      <Text variant="captionStrong" color="textSecondary">
        {t(MeterTypeLabelKey[type])}
      </Text>
    </View>
  );
}

/** Right tab: whose meter it is. */
export function ProviderRibbon({ provider }: { provider: MeterProvider }) {
  const { t } = useI18n();
  const { colors } = useTheme();
  const utility = utilityFor(provider);

  return (
    <View
      style={[styles.tab, styles.right, { backgroundColor: colors.surfacePressed }]}
    >
      {/*
        The mark sits on its own white chip rather than straight on the ribbon:
        both logos are dark blue with a transparent background, so against the
        ribbon's fill in dark mode they would all but vanish. Recolouring another
        company's logo is not ours to do, so the tile underneath is what changes.
      */}
      <View style={styles.logo}>
        <Image
          source={utility.logo}
          style={styles.logoImage}
          contentFit="contain"
          // Decorative: the provider's name is right beside it in text.
          accessible={false}
        />
      </View>
      <Text variant="captionStrong" color="textSecondary">
        {t(utility.nameKey)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  band: {
    flexDirection: "row",
    // Holds a lone ribbon against the right edge and splits a pair to the two
    // corners, without either case needing a spacer.
    justifyContent: "space-between",
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    height: RIBBON_HEIGHT,
    paddingHorizontal: Spacing.md,
  },
  /**
   * Square where each tab meets the card's body, rounded where it meets the
   * card's own outer corner, so they read as part of the card rather than as
   * stickers laid on top of it.
   */
  left: {
    borderTopLeftRadius: Radius.lg,
    borderBottomRightRadius: Radius.md,
  },
  right: {
    borderTopRightRadius: Radius.lg,
    borderBottomLeftRadius: Radius.md,
    // Beats the band's `space-between` when this is the only tab in it, which
    // would otherwise park a lone provider ribbon on the left.
    marginLeft: "auto",
  },
  logo: {
    width: LOGO,
    height: LOGO,
    borderRadius: Radius.sm,
    backgroundColor: "#FFFFFF",
    // The marks are drawn to the edge of their square canvas, so without an
    // inset they touch the chip's rounded corners.
    padding: 1,
    overflow: "hidden",
  },
  logoImage: {
    width: "100%",
    height: "100%",
  },
});
