import Svg, { Path } from "react-native-svg";

import { useTheme, type ColorName } from "@/theme";

/**
 * A solid star, inlined rather than pulled from the Hugeicons set the rest of
 * the app uses — the free tier ships only the outlined `StarIcon`, and the whole
 * point here is the contrast between the two: hollow means "tap to make this
 * primary", filled means "this one already is".
 *
 * Same exception, and the same reasoning, as `check-circle.tsx`: a fill states a
 * settled fact at a glance, where a stroke reads as a control.
 *
 * Drawn on a 256 grid, which is the artwork's own viewBox. Not rescaled to
 * Hugeicons' 24 — `size` maps to the SVG's width and height, so the viewBox only
 * has to agree with the path data.
 */
const STAR_FILL =
  "M234.00977,115.47367,188.77539,153.1221l14.35938,58.07813a16.64744,16.64744," +
  "0,0,1-6.35938,17.67969,16.14026,16.14026,0,0,1-18.20312.5625l-50.4375-31.9531" +
  "3c-.14063-.07812-.20313-.04687-.26563,0l-46.875,29.69531a17.83088,17.83088,0," +
  "0,1-20.0625-.625A18.37492,18.37492,0,0,1,53.916,207.044l13.51562-53.16406-45." +
  "4375-38.40625a16.68222,16.68222,0,0,1-5.15625-18.0625A16.37036,16.37036,0,0,1," +
  "31.36914,86.044L90.43164,82.208,112.791,26.41117a16.324,16.324,0,0,1,15.1875-1" +
  "0.41407h.01562a16.33117,16.33117,0,0,1,15.21875,10.41407l22.03125,55.47656L224" +
  ".63477,86.044A16.37036,16.37036,0,0,1,239.166,97.41117,16.68222,16.68222,0,0,1" +
  ",234.00977,115.47367Z";

export function StarFill({
  size = 20,
  color = "primary",
}: {
  size?: number;
  /** A theme colour name rather than a literal, so it follows the scheme. */
  color?: ColorName;
}) {
  const { colors } = useTheme();

  return (
    <Svg width={size} height={size} viewBox="0 0 256 256">
      <Path d={STAR_FILL} fill={colors[color]} />
    </Svg>
  );
}
