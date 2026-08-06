import { Image, type ImageSource } from "expo-image";
import { StyleSheet, View } from "react-native";
import Animated from "react-native-reanimated";

import { METER_TYPES, type MeterType } from "@/api/types";
import { MeterTypeLabelKey } from "@/components/meter-artwork";
import { ProviderCardArtHeight } from "@/components/provider-picker";
import { CheckCircle } from "@/components/ui/check-circle";
import { Text } from "@/components/ui/text";
import {
  AnimatedPressable,
  useSelectionAnimation,
} from "@/components/ui/use-selection-animation";
import { useI18n } from "@/i18n";
import { Radius, Spacing, useTheme } from "@/theme";

/**
 * Home / office / industry chooser.
 *
 * Deliberately its own component rather than a variant of the provider picker:
 * the two only look alike. These are our own opaque square renders, shown at a
 * fixed square size with `cover`; provider marks are third-party transparent
 * wordmarks that must be `contain`-fitted into a full-width tile and can carry
 * a status tag. Folding both into one component meant every style branched on a
 * variant flag, and neither case ended up quite right.
 */
const ART: Record<MeterType, ImageSource> = {
  HOME: require("@/assets/images/meter/home.png") as ImageSource,
  OFFICE: require("@/assets/images/meter/office.png") as ImageSource,
  INDUSTRY: require("@/assets/images/meter/industry.png") as ImageSource,
};

/**
 * Square, because the source renders are square and cropping them looks wrong.
 *
 * Sized so this card comes out exactly as tall as a provider card: both use the
 * same bottom padding, gap and label variant, so matching the space above the
 * label is enough. This card has no corner tag to reserve headroom for, so the
 * tile absorbs what the provider card spends on its top inset.
 */
const TILE = ProviderCardArtHeight - Spacing.md;

export function MeterTypePicker({
  value,
  onChange,
}: {
  value: MeterType;
  onChange(next: MeterType): void;
}) {
  return (
    <View accessibilityRole="radiogroup" style={styles.group}>
      {METER_TYPES.map((type) => (
        <MeterTypeCard
          key={type}
          type={type}
          selected={type === value}
          onPress={() => onChange(type)}
        />
      ))}
    </View>
  );
}

/**
 * A component per card rather than a loop body, because `useSelectionAnimation`
 * is a hook and calling it inside `.map()` would break the rules of hooks.
 */
function MeterTypeCard({
  type,
  selected,
  onPress,
}: {
  type: MeterType;
  selected: boolean;
  onPress(): void;
}) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const { cardStyle, checkStyle, onPressIn, onPressOut } =
    useSelectionAnimation(selected);

  const label = t(MeterTypeLabelKey[type]);

  return (
    <AnimatedPressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      style={[styles.card, cardStyle]}
    >
      {/* Always mounted, so it can animate out as well as in. */}
      <Animated.View style={[styles.check, checkStyle]} pointerEvents="none">
        <CheckCircle size={18} />
      </Animated.View>

      <View style={[styles.tile, { borderColor: colors.border }]}>
        <Image
          source={ART[type]}
          style={styles.image}
          contentFit="cover"
          transition={120}
          accessible={false}
        />
      </View>

      {/* `caption`, matching the provider card — a larger variant here would
          not only look mismatched, it would make this card taller in Bangla,
          where line height scales with the type size. */}
      <Text
        variant="caption"
        align="center"
        color={selected ? "primary" : "text"}
        numberOfLines={1}
      >
        {label}
      </Text>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  group: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  card: {
    flex: 1,
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
    // Constant width, colour animated — see the note in useSelectionAnimation
    // about why border width is never animated.
    borderWidth: 2,
  },
  check: {
    position: "absolute",
    top: Spacing.xs,
    right: Spacing.xs,
    zIndex: 1,
  },
  tile: {
    width: TILE,
    height: TILE,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
