import {
  HindSiliguri_400Regular,
  HindSiliguri_500Medium,
  HindSiliguri_600SemiBold,
  HindSiliguri_700Bold,
} from '@expo-google-fonts/hind-siliguri';
import type { TextStyle } from 'react-native';

import type { FontWeight } from './tokens';

/** Passed straight to `useFonts`. Keys become the registered family names. */
export const FontAssets = {
  HindSiliguri_400Regular,
  HindSiliguri_500Medium,
  HindSiliguri_600SemiBold,
  HindSiliguri_700Bold,
} as const;

/**
 * One family for the whole app, both locales.
 *
 * Hind Siliguri covers Bengali and Latin, so a screen never changes voice
 * mid-sentence — which is what a Latin-only face would do here, since Bangla
 * set in it falls back to the system font or renders as tofu, and English
 * copy routinely carries Bangla names and addresses from the backend.
 *
 * Weight is part of the family name rather than a `fontWeight` style, because
 * Android does not synthesise weights for custom families: asking for
 * `fontWeight: '700'` on `HindSiliguri_400Regular` silently renders regular.
 */
const FAMILIES: Record<FontWeight, keyof typeof FontAssets> = {
  '400': 'HindSiliguri_400Regular',
  '500': 'HindSiliguri_500Medium',
  '600': 'HindSiliguri_600SemiBold',
  '700': 'HindSiliguri_700Bold',
};

export function fontFamily(weight: FontWeight): string {
  return FAMILIES[weight];
}

/**
 * Asks for tabular (equal-advance) figures on balances, meter numbers and
 * dates — anything read as a column.
 *
 * Currently inert: Hind Siliguri ships no `tnum` (its GSUB carries only the
 * Bengali shaping features — `akhn`, `blwf`, `pres`, `rphf` and friends), and
 * its figures are proportional in both scripts — Latin `1` advances 323/1000em
 * against `0`'s 544, Bengali ২ 487 against ৩'s 661. So numeric columns sit
 * slightly ragged, the cost of running one family across both locales.
 *
 * Kept at the call sites regardless: it marks which text is columnar data, and
 * the day the family gains `tnum` or gets swapped, alignment returns with no
 * edits beyond this file.
 */
export const TabularNumbers: TextStyle = { fontVariant: ['tabular-nums'] };
