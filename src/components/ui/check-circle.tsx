import Svg, { Path } from "react-native-svg";

import { useTheme, type ColorName } from "@/theme";

/**
 * Bootstrap Icons' `check-circle-fill`, inlined rather than pulled from the
 * Hugeicons set the rest of the app uses.
 *
 * Two reasons it is worth the exception:
 *   - at 16px a stroked circle-and-tick loses the tick to antialiasing; a solid
 *     disc still reads as "chosen" at a glance.
 *   - the tick is a knockout, not a stroke. The single path draws the disc
 *     clockwise and the tick counter-clockwise, so the default nonzero fill
 *     rule punches the tick out and whatever sits behind the icon shows
 *     through — on a selected card that is `primarySoft`, which needs no
 *     second colour to stay legible.
 */
const CHECK_CIRCLE_FILL =
  "M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 " +
  "9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l" +
  "3.992-4.99a.75.75 0 0 0-.01-1.05z";

export function CheckCircle({
  size = 16,
  color = "primary",
}: {
  size?: number;
  /** A theme colour name rather than a literal, so it follows the scheme. */
  color?: ColorName;
}) {
  const { colors } = useTheme();

  return (
    <Svg width={size} height={size} viewBox="0 0 16 16">
      <Path d={CHECK_CIRCLE_FILL} fill={colors[color]} />
    </Svg>
  );
}
