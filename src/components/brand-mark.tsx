import { Image, type ImageSource } from "expo-image";

import { useTheme, type ColorScheme } from "@/theme";

/**
 * The logo, one file per scheme.
 *
 * These two live in the icon pipeline (`app.json` feeds them to Android's
 * adaptive icon), and despite the names neither is a silhouette: both are the
 * full-colour artwork on a rounded tile, differing only in that tile — brand
 * blue for `monochrome`, near-white for `foreground`. That baked-in tile is why
 * nothing here sets a background or a corner radius.
 *
 * The SVGs in `assets/expo.icon` were the obvious source and cannot be used:
 * they attach the drawing as a Figma pattern fill around a base64 bitmap, and
 * that chain defeats the decoders expo-image relies on (androidsvg 1.4 on
 * Android, CoreSVG on iOS), which fail silently to a blank view.
 */
const Logo: Record<ColorScheme, ImageSource> = {
  dark: require("@/assets/images/android-icon-monochrome.png") as ImageSource,
  light: require("@/assets/images/android-icon-foreground.png") as ImageSource,
};

export function BrandMark({ size = 72 }: { size?: number }) {
  const { scheme } = useTheme();

  return (
    <Image
      source={Logo[scheme]}
      style={{ width: size, height: size }}
      contentFit="contain"
      transition={160}
      // Decorative: the heading beside it already names the app.
      accessible={false}
    />
  );
}
