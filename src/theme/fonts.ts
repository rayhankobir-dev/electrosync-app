import {
  HindSiliguri_400Regular,
  HindSiliguri_500Medium,
  HindSiliguri_600SemiBold,
  HindSiliguri_700Bold,
} from "@expo-google-fonts/hind-siliguri";
import type { TextStyle } from "react-native";

import type { FontWeight } from "./tokens";

export const FontAssets = {
  HindSiliguri_400Regular,
  HindSiliguri_500Medium,
  HindSiliguri_600SemiBold,
  HindSiliguri_700Bold,
  // Bundled rather than fetched: Li Ador Noirrit is not on Google Fonts, so
  // there is no `@expo-google-fonts` package to resolve it from.
  LiAdorNoirrit_400Regular: require("@/assets/fonts/LiAdorNoirrit-Regular.ttf"),
  LiAdorNoirrit_600SemiBold: require("@/assets/fonts/LiAdorNoirrit-SemiBold.ttf"),
  LiAdorNoirrit_700Bold: require("@/assets/fonts/LiAdorNoirrit-Bold.ttf"),
} as const;

const FAMILIES: Record<FontWeight, keyof typeof FontAssets> = {
  "400": "HindSiliguri_400Regular",
  "500": "HindSiliguri_500Medium",
  "600": "HindSiliguri_600SemiBold",
  "700": "HindSiliguri_700Bold",
};

/**
 * Li Ador Noirrit, for Bangla numerals — its digits are the ones Bangladeshi
 * readers see on bills and meters, where Hind Siliguri's are noticeably
 * narrower and flatter than the printed convention.
 *
 * Note "500" resolves to SemiBold, not Regular. The family ships no Medium
 * weight (ExtraLight, Light, Regular, SemiBold, Bold only), and CSS-style
 * matching would fall *down* to Regular — which puts a `subhead` value in
 * `meter-info-card` a step lighter than the Hind Siliguri Medium label beside
 * it, reading as a rendering fault. Rounding up instead lands the data slightly
 * heavier than its label, which is the hierarchy those rows want anyway. Flip
 * this one entry if the family ever gains a Medium.
 */
const NUMERIC_FAMILIES: Record<FontWeight, keyof typeof FontAssets> = {
  "400": "LiAdorNoirrit_400Regular",
  "500": "LiAdorNoirrit_600SemiBold",
  "600": "LiAdorNoirrit_600SemiBold",
  "700": "LiAdorNoirrit_700Bold",
};

export function fontFamily(weight: FontWeight): string {
  return FAMILIES[weight];
}

/**
 * Family for digits read as data — balances, meter readings, dates.
 *
 * Bangla only; English numerals stay on Hind Siliguri so Latin copy keeps one
 * family throughout. Safe against the line-height trap documented on
 * `BENGALI_LINE_HEIGHT_RATIO`: Li Ador Noirrit's line box is 1.322em
 * (winAscent 972 + winDescent 350 over a 1000 unitsPerEm) against Hind
 * Siliguri's 1.617em, so it asks for *less* room than the family already
 * setting every Bangla line — no variant needs extra leading to avoid clipping.
 */
export function numericFontFamily(weight: FontWeight, locale: string): string {
  return locale === "bn" ? NUMERIC_FAMILIES[weight] : FAMILIES[weight];
}

export const TabularNumbers: TextStyle = { fontVariant: ["tabular-nums"] };
