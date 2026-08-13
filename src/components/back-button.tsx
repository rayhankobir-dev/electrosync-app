import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import {
  Pressable,
  StyleSheet,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { Icon } from "@/components/ui/icon";
import { useI18n } from "@/i18n";
import { HitSlop, Radius, useTheme } from "@/theme";

/**
 * The circle's diameter, and the glyph inside it. Sized as a pair: the ring of
 * fill around the arrow is what makes it read as a button rather than as a tint
 * behind an icon, so shrinking the circle without the glyph would close that gap
 * instead of scaling it.
 *
 * The tap target does not shrink with it — `hitSlop` keeps the area that responds
 * well clear of the 44pt floor.
 *
 * `BackButtonSize` is exported because callers align *to* the circle: a header
 * that centres it against a line of type needs the height to do the arithmetic,
 * and copying `32` there is how the two drift apart.
 */
export const BackButtonSize = 32;
const BackIconSize = 20;

/**
 * The way back, wherever it appears.
 *
 * Its own component rather than markup inside `ScreenHeader`, because not every
 * screen with a back arrow can use that header — the meter detail page builds its
 * own top bar around a provider mark — and a second hand-rolled arrow is how one
 * screen ends up with a bare glyph while the rest have a button.
 *
 * `onPress` is required rather than defaulting to `router.back()`: going back is
 * not always the same as popping the stack. The meter page pushes to the meters
 * list instead, since it is reachable from places that make the stack a poor
 * account of where "back" ought to lead.
 */
export function BackButton({
  onPress,
  style,
}: {
  onPress(): void;
  /** For placement only — the circle itself is not the caller's to restyle. */
  style?: StyleProp<ViewStyle>;
}) {
  const { t } = useI18n();
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("common.back")}
      hitSlop={HitSlop / 4}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: pressed ? colors.surfacePressed : colors.surface,
          // Bordered rather than shadowed, like every other raised thing here —
          // a shadow reads as noise in dark mode, and on the light scheme a
          // white circle on the near-white background has no edge of its own
          // without it.
          borderColor: colors.border,
        },
        style,
      ]}
    >
      <Icon icon={ArrowLeft01Icon} size={BackIconSize} color="textSecondary" />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: BackButtonSize,
    height: BackButtonSize,
    borderRadius: Radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
});
