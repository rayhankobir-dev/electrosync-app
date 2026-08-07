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
} as const;

const FAMILIES: Record<FontWeight, keyof typeof FontAssets> = {
  "400": "HindSiliguri_400Regular",
  "500": "HindSiliguri_500Medium",
  "600": "HindSiliguri_600SemiBold",
  "700": "HindSiliguri_700Bold",
};

export function fontFamily(weight: FontWeight): string {
  return FAMILIES[weight];
}

export const TabularNumbers: TextStyle = { fontVariant: ["tabular-nums"] };
