import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";

import type { MeterProvider } from "@/api/types";
import { CheckCircle } from "@/components/ui/check-circle";
import { Text } from "@/components/ui/text";
import {
  AnimatedPressable,
  useSelectionAnimation,
} from "@/components/ui/use-selection-animation";
import { useI18n } from "@/i18n";
import { Radius, Spacing, useTheme } from "@/theme";
import { UTILITIES, type UtilityAdapter } from "@/utility";

/**
 * Provider chooser, driven by the utility registry — adding a provider there
 * adds a card here with no change to this file.
 *
 * Separate from the meter-type picker on purpose: these are third-party
 * transparent wordmarks of wildly different aspect ratios (NESCO and DESCO are
 * wide lockups, DPDC is a circular seal), so they need `contain` into a
 * full-width tile. They can also carry a status tag, which the type picker
 * never does.
 */

/** Height of the status tag. 18 clears Bangla's 16pt `micro` line height. */
const TAG_HEIGHT = 18;

/** Named because the tag's offset is measured against it. */
const CARD_BORDER = 2;

/**
 * How far the tag rises above the card's outer top edge — half its height, so
 * it straddles the border. Fully clear of the card it would float unattached to
 * either of two side-by-side cards; fully inside, it covered the wordmark.
 */
const TAG_OVERHANG = TAG_HEIGHT / 2;

/**
 * Drives the height of the meter-type tile too, via `ProviderCardArtHeight` —
 * so the two pickers stay the same height whatever this is set to.
 */
const LOGO_HEIGHT = 64;

/**
 * Inner top padding. Plain breathing room now that the tag hangs outside the
 * card — it used to have to reserve headroom for the tag on *every* card,
 * tagged or not, to stop the row of logos from sitting at ragged offsets.
 */
const TOP_INSET = Spacing.md;

/**
 * Height of everything above the label, measured from the card's inner top
 * edge. Sibling pickers size their artwork against this so every card in the
 * form comes out the same height — see `meter-type-picker`.
 */
export const ProviderCardArtHeight = TOP_INSET + LOGO_HEIGHT;

export function ProviderPicker({
  value,
  onChange,
}: {
  value: MeterProvider;
  onChange(next: MeterProvider): void;
}) {
  return (
    <View accessibilityRole="radiogroup" style={styles.group}>
      {UTILITIES.map((utility) => (
        <ProviderCard
          key={utility.provider}
          utility={utility}
          selected={utility.provider === value}
          onPress={() => onChange(utility.provider)}
        />
      ))}
    </View>
  );
}

/**
 * A component per card rather than a loop body, because `useSelectionAnimation`
 * is a hook — calling it inside `.map()` would break the rules of hooks the
 * moment the provider list changed length.
 */
function ProviderCard({
  utility,
  selected,
  onPress,
}: {
  utility: UtilityAdapter;
  selected: boolean;
  onPress(): void;
}) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { cardStyle, checkStyle, onPressIn, onPressOut } =
    useSelectionAnimation(selected);

  return (
    <AnimatedPressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={utility.displayName}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={[styles.card, cardStyle]}
    >
      {!utility.supported ? (
        // The slot spans the card so the pill centres deterministically; an
        // absolute child with no horizontal insets would be at the mercy of the
        // parent's `alignItems`.
        <View style={styles.tagSlot} pointerEvents="none">
          <View
            style={[
              styles.tag,
              { backgroundColor: colors.warningSoft, borderColor: colors.warning },
            ]}
          >
            <Text variant="micro" color="warning" numberOfLines={1}>
              {t("meters.comingSoon")}
            </Text>
          </View>
        </View>
      ) : null}

      {/* Always mounted, so it can animate out as well as in — unmounting on
          deselect would make it vanish instantly. */}
      <Animated.View style={[styles.check, checkStyle]} pointerEvents="none">
        <CheckCircle size={18} />
      </Animated.View>

      {/* No backdrop, by request. Trade-off: these wordmarks are dark ink on
          transparent, so on the dark theme they sit dark-on-dark. */}
      <Image
        source={utility.logo}
        style={styles.logo}
        contentFit="contain"
        transition={120}
        accessible={false}
      />

      <Text
        variant="caption"
        align="center"
        color={selected ? "primary" : "text"}
        numberOfLines={1}
      >
        {utility.displayName}
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  group: {
    flexDirection: "row",
    gap: Spacing.sm,
    // Headroom for the tags hanging above the cards. Android clips a child that
    // overflows its parent's box, so the row has to own the space the tag needs
    // — a negative offset alone would render on iOS and web and vanish there.
    paddingTop: TAG_OVERHANG,
  },
  card: {
    flex: 1,
    alignItems: "center",
    gap: Spacing.xs,
    paddingTop: TOP_INSET,
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
    // Constant width, colour animated — see the note in useSelectionAnimation
    // about why border width is never animated.
    borderWidth: CARD_BORDER,
    // No `overflow: hidden` — it existed only to clip the tag into the card's
    // rounded corner, and the tag now has to escape the card entirely.
  },
  tagSlot: {
    position: "absolute",
    // Offsets are measured from the padding box, which starts inside the
    // border, so the border has to be added back to clear the card's edge.
    top: -(TAG_OVERHANG + CARD_BORDER),
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 1,
  },
  /**
   * Fully rounded and outlined, unlike the flush corner tag it replaces. The
   * pale fill alone blurred into both the card and the screen behind it, and the
   * card's own 2px border appeared to run straight through the pill.
   */
  tag: {
    height: TAG_HEIGHT,
    justifyContent: "center",
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: StyleSheet.hairlineWidth,
  },
  check: {
    position: "absolute",
    top: Spacing.xs,
    right: Spacing.xs,
    zIndex: 1,
  },
  logo: {
    width: "100%",
    height: LOGO_HEIGHT,
  },
});
