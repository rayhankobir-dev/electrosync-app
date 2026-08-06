import {
  HindSiliguri_400Regular,
  HindSiliguri_500Medium,
  HindSiliguri_600SemiBold,
  HindSiliguri_700Bold,
} from '@expo-google-fonts/hind-siliguri';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import type { TextStyle } from 'react-native';

import type { Locale } from '@/i18n/types';

import type { FontWeight } from './tokens';

/** Passed straight to `useFonts`. Keys become the registered family names. */
export const FontAssets = {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  HindSiliguri_400Regular,
  HindSiliguri_500Medium,
  HindSiliguri_600SemiBold,
  HindSiliguri_700Bold,
} as const;

/**
 * Family is chosen by locale, not by a single app-wide default.
 *
 * Inter carries no Bengali glyphs, so Bangla set in Inter falls back to the
 * system font mid-sentence — or renders as tofu. Hind Siliguri covers both
 * scripts, so it is the safe choice whenever Bangla can appear.
 *
 * One family per locale, prose and figures alike. Splitting figures onto a
 * second Bengali face buys tabular digits — Hind Siliguri's are proportional
 * and unevenly so, ২ advancing 487/1000em against ৩'s 661 — but two Bengali
 * faces in one card do not sit together well, and the seam is more noticeable
 * than the raggedness it fixes.
 *
 * Weight is part of the family name rather than a `fontWeight` style, because
 * Android does not synthesise weights for custom families: asking for
 * `fontWeight: '700'` on `Inter_400Regular` silently renders regular.
 */
const FAMILIES: Record<Locale, Record<FontWeight, keyof typeof FontAssets>> = {
  en: {
    '400': 'Inter_400Regular',
    '500': 'Inter_500Medium',
    '600': 'Inter_600SemiBold',
    '700': 'Inter_700Bold',
  },
  bn: {
    '400': 'HindSiliguri_400Regular',
    '500': 'HindSiliguri_500Medium',
    '600': 'HindSiliguri_600SemiBold',
    '700': 'HindSiliguri_700Bold',
  },
};

export function fontFamily(locale: Locale, weight: FontWeight): string {
  return FAMILIES[locale][weight];
}

/**
 * Tabular figures for balances, meter numbers and dates — anything read as a
 * column. Applied on top of the locale family, never in place of it: pinning
 * figures to a Latin family would strand Bangla, where `formatNumber` returns
 * Bengali digits (০-৯) and `formatCurrency` prefixes ৳, neither of which Inter
 * carries.
 *
 * Only load-bearing in English. Inter's digits are proportional by default
 * (`1` advances 407/1000em against `4`'s 646) but it ships a `tnum` feature
 * that equalises them. Hind Siliguri has no `tnum`, so this is inert in Bangla
 * and its figures stay proportional — a deliberate trade for keeping one
 * Bengali face throughout.
 */
export const TabularNumbers: TextStyle = { fontVariant: ['tabular-nums'] };
