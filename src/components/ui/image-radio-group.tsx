import { CheckmarkCircle02Icon } from "@hugeicons/core-free-icons";
import { Image, type ImageSource } from "expo-image";
import { Pressable, StyleSheet, View } from "react-native";

import { Radius, Spacing, useTheme, type ColorName } from "@/theme";

import { Icon } from "./icon";
import { Text } from "./text";

export type ImageRadioOption<T extends string> = {
  value: T;
  label: string;
  image: ImageSource;
  /**
   * Short status note, e.g. "Coming soon". Rendered as a badge floating over
   * the card rather than as a line of text: in the flow it made the one card
   * that had a caption taller than its neighbours, so a row of two providers
   * sat at two different heights.
   */
  caption?: string;
  captionTone?: CaptionTone;
};

export type CaptionTone = "warning" | "textTertiary";

/** Foreground and fill per tone, so the badge stays legible in both schemes. */
const CAPTION_COLORS: Record<
  CaptionTone,
  { text: ColorName; fill: ColorName }
> = {
  warning: { text: "warning", fill: "warningSoft" },
  textTertiary: { text: "textSecondary", fill: "surfacePressed" },
};

export type ImageRadioVariant = "logo" | "art";

/** Height of the status strip, and the headroom every card reserves for it. */
const CAPTION_STRIP_HEIGHT = 16;

/**
 * `art` tiles are square and fixed-width, not full-bleed like the logo tiles.
 * The source renders are square, so a wide tile would crop them; and at 56 the
 * tile reads a touch smaller than a three-up logo tile, which keeps the two
 * pickers from competing.
 */
const ART_TILE_SIZE = 56;

/**
 * Image-above-label radio cards.
 *
 * Two image treatments, because the two kinds of image behave differently:
 *   - `logo`  third-party brand marks: transparent PNGs rendered with no
 *             backdrop and `contain` (cropping a wordmark is not an option).
 *   - `art`   our own illustrations: opaque square renders, so they are
 *             clipped to a rounded tile with `cover` and need no backdrop.
 */
export function ImageRadioGroup<T extends string>({
  options,
  value,
  onChange,
  variant = "logo",
}: {
  options: readonly ImageRadioOption<T>[];
  value: T;
  onChange(next: T): void;
  variant?: ImageRadioVariant;
}) {
  const { colors } = useTheme();
  const tileHeight = variant === "art" ? 60 : options.length > 2 ? 48 : 64;
  const hasCaption = options.some((option) => option.caption);
  const topInset = hasCaption ? CAPTION_STRIP_HEIGHT + Spacing.xs : Spacing.md;

  return (
    <View accessibilityRole="radiogroup" style={styles.group}>
      {options.map((option) => {
        const selected = option.value === value;

        return (
          <Pressable
            key={option.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.card,
              {
                paddingTop: topInset,
                backgroundColor: selected ? colors.primarySoft : colors.surface,
                borderColor: selected ? colors.primary : colors.border,
                borderWidth: selected ? 2 : StyleSheet.hairlineWidth,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            {/* Corner tag in the card's top-left. */}
            {option.caption ? (
              <View
                style={[
                  styles.captionBadge,
                  {
                    backgroundColor:
                      colors[
                        CAPTION_COLORS[option.captionTone ?? "textTertiary"]
                          .fill
                      ],
                  },
                ]}
              >
                <Text
                  variant="micro"
                  align="center"
                  color={
                    CAPTION_COLORS[option.captionTone ?? "textTertiary"].text
                  }
                  numberOfLines={1}
                >
                  {option.caption}
                </Text>
              </View>
            ) : null}

            {selected ? (
              // Top-right, opposite the corner tag, so the two never collide.
              <View style={styles.check}>
                <Icon icon={CheckmarkCircle02Icon} size={16} color="primary" />
              </View>
            ) : null}

            <View
              style={[
                styles.tile,
                variant === "logo"
                  ? [styles.logoTile, { height: tileHeight }]
                  : [
                      styles.artTile,
                      {
                        borderColor: colors.border,
                        borderWidth: StyleSheet.hairlineWidth,
                      },
                    ],
              ]}
            >
              <Image
                source={option.image}
                style={styles.image}
                contentFit={variant === "logo" ? "contain" : "cover"}
                transition={120}
                accessible={false}
              />
            </View>

            <Text
              variant="caption"
              align="center"
              color={selected ? "primary" : "text"}
              numberOfLines={1}
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
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
    paddingBottom: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: Radius.md,
    // Clips the status strip to the card's rounded top corners.
    overflow: "hidden",
  },
  check: {
    position: "absolute",
    top: Spacing.xs,
    right: Spacing.xs,
    zIndex: 1,
  },
  tile: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.sm,
    overflow: "hidden",
  },
  artTile: {
    width: ART_TILE_SIZE,
    height: ART_TILE_SIZE,
    borderRadius: Radius.md,
  },
  logoTile: {
    width: "100%",
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs,
    // No backdrop, by request. Note the trade-off: these wordmarks are dark
    // navy on transparent, so on the dark theme they sit dark-on-dark. If dark
    // mode matters, light-mode-only tinting is the fix, not a global backdrop.
  },
  image: {
    width: "100%",
    height: "100%",
  },
  captionBadge: {
    position: "absolute",
    top: 0,
    left: 0,
    height: CAPTION_STRIP_HEIGHT,
    justifyContent: "center",
    paddingHorizontal: Spacing.xs + 1,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: Radius.sm,
  },
});
