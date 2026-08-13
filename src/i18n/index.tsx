import * as Localization from "expo-localization";
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { prefsStorage } from "@/lib/storage";

import en from "./locales/en.json";
import bn from "./locales/bn.json";
import { isLocale, type Locale } from "./types";

export type { Locale } from "./types";
export { LOCALES, isLocale } from "./types";

const RESOURCES = { en, bn } as const;

const LOCALE_KEY = "electrosync.locale";

/**
 * Dotted paths into the English bundle — `'auth.signIn.title'` and so on.
 * English is the reference bundle: a key missing from it is a compile error at
 * the call site, which is what stops the two files drifting apart.
 */
type DotPaths<T> = {
  [K in keyof T & string]: T[K] extends string ? K : `${K}.${DotPaths<T[K]>}`;
}[keyof T & string];

export type TranslationKey = DotPaths<typeof en>;

type Params = Record<string, string | number>;

const BENGALI_DIGITS = ["০", "১", "২", "৩", "৪", "৫", "৬", "৭", "৮", "৯"];

/**
 * A month name reduced to a form that compares equal across the spellings the
 * same month is written in.
 *
 * The portal's month cell is a rendered string, not an enum, and Bangla month
 * names have more than one accepted spelling: জানুয়ারী and জানুয়ারি differ
 * only by a vowel sign, আগষ্ট and আগস্ট only by a sibilant, সেপ্টেম্বার and
 * সেপ্টেম্বর only by an ending. Matching the raw string means one of those
 * spellings maps and the rest fall through to the untranslated portal text —
 * which reads as Bangla inside the Bangla app and so hides itself there, while
 * showing up as Bangla in the middle of the English one.
 *
 * Folding both the map's keys and the lookup means a variant costs a label, not
 * a match.
 */
function foldMonthName(raw: string): string {
  return (
    raw
      .trim()
      .toLowerCase()
      // Zero-width joiners ride along in HTML and break string equality while
      // being invisible in every place a human would look for the difference.
      .replace(/[‌‍]/g, "")
      .replace(/\s+/g, "")
      // Long ī for short i, মূর্ধন্য ষ for দন্ত্য স, and the -বার ending for
      // -বর. Applied to the keys as well, so this is a fold, not a guess about
      // which spelling is correct.
      .replace(/ী/g, "ি")
      .replace(/ষ/g, "স")
      .replace(/বার$/, "বর")
  );
}

/**
 * Folded month name → month number, built from both bundles.
 *
 * English names and their three-letter abbreviations are indexed alongside the
 * Bangla ones because the portal already answers in both: its recharge dates
 * carry `'JAN'`-style abbreviations, so an English month cell is not a
 * hypothetical shape for the same source to return.
 */
const MONTH_NUMBERS = new Map<string, number>();

for (const [number, name] of Object.entries(bn.months)) {
  MONTH_NUMBERS.set(foldMonthName(name), Number(number));
}

for (const [number, name] of Object.entries(en.months)) {
  MONTH_NUMBERS.set(foldMonthName(name), Number(number));
  MONTH_NUMBERS.set(foldMonthName(name.slice(0, 3)), Number(number));
}

/**
 * Spellings no fold reaches, because they differ by a whole letter rather than a
 * sign. Listed rather than folded for exactly that reason — a rule loose enough
 * to catch these would start matching things that are not months.
 */
for (const [name, number] of Object.entries({
  অগাস্ট: 8,
  অগস্ট: 8,
})) {
  MONTH_NUMBERS.set(foldMonthName(name), number);
}

/**
 * Month number 1-12 for a month name as the NESCO portal renders it, or `null`
 * if it is not one.
 *
 * A plain function rather than part of the `useI18n` value: it does not depend
 * on the active locale — the portal answers in its own language, not the app's —
 * and callers need it for *ordering*, which has to work the same in both
 * languages. Sorting consumption rows is impossible without it, since the wire
 * format carries the month only as a localised string.
 */
export function portalMonthNumber(portalMonth: string): number | null {
  return MONTH_NUMBERS.get(foldMonthName(portalMonth)) ?? null;
}

function toBengaliDigits(input: string): string {
  return input.replace(/\d/g, (d) => BENGALI_DIGITS[Number(d)]);
}

function groupDigits(whole: string): string {
  if (whole.length <= 3) return whole;
  const last3 = whole.slice(-3);
  const rest = whole.slice(0, -3);
  return `${rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",")},${last3}`;
}

function lookup(locale: Locale, key: string): string | undefined {
  const segments = key.split(".");
  let node: unknown = RESOURCES[locale];

  for (const segment of segments) {
    if (typeof node !== "object" || node === null) return undefined;
    node = (node as Record<string, unknown>)[segment];
  }

  return typeof node === "string" ? node : undefined;
}

function interpolate(template: string, params?: Params): string {
  if (!params) return template;
  return template.replace(/\{\{(\w+)\}\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

export type I18n = {
  locale: Locale;
  setLocale(next: Locale): void;
  /** Falls back to English, then to the key itself, so the UI never renders blank. */
  t(key: TranslationKey, params?: Params): string;
  formatNumber(value: number, fractionDigits?: number): string;
  /**
   * Rewrites ASCII digits into the active locale's numerals, leaving every other
   * character alone.
   *
   * For digits that arrive already formed — meter and consumer numbers, which
   * are identifiers rather than quantities and so must keep their exact length
   * and any leading zero. Idempotent: text that is already in Bangla numerals
   * passes through untouched.
   */
  localizeDigits(text: string): string;
  /** BDT, with the symbol leading: `৳1,523.45`. */
  formatCurrency(value: number, fractionDigits?: number): string;
  /** Takes Unix epoch **seconds**, which is what every backend timestamp uses. */
  formatDate(epochSeconds: number): string;
  /** Month number 1-12 in the active locale. */
  formatMonth(month: number): string;
  /**
   * A year, digits localised but never grouped — `formatNumber` would render
   * 2026 as "2,026".
   */
  formatYear(year: number): string;
  /**
   * Re-localises a month name that arrived from the NESCO portal already
   * rendered in Bangla. Unrecognised values pass through unchanged.
   */
  localizePortalMonth(portalMonth: string): string;
};

const I18nContext = createContext<I18n | null>(null);

function deviceLocale(): Locale {
  const preferred = Localization.getLocales()[0]?.languageCode;
  return preferred === "bn" ? "bn" : "en";
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(deviceLocale);

  // Device locale is only the first guess; a stored choice outranks it.
  useEffect(() => {
    let cancelled = false;

    void prefsStorage.get(LOCALE_KEY).then((stored) => {
      if (!cancelled && isLocale(stored)) setLocaleState(stored);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const setLocale = useCallback((next: Locale) => {
    // Applied immediately and persisted in the background: a slow write must
    // never make the language switch feel laggy.
    setLocaleState(next);
    void prefsStorage.set(LOCALE_KEY, next);
  }, []);

  const value = useMemo<I18n>(() => {
    const localizeDigits = (text: string) =>
      locale === "bn" ? toBengaliDigits(text) : text;

    const formatNumber = (input: number, fractionDigits = 0) => {
      if (!Number.isFinite(input)) return "—";
      const negative = input < 0;
      const fixed = Math.abs(input).toFixed(fractionDigits);
      const [whole, fraction] = fixed.split(".");
      const grouped = groupDigits(whole);
      const joined = fraction ? `${grouped}.${fraction}` : grouped;
      return `${negative ? "-" : ""}${localizeDigits(joined)}`;
    };

    return {
      locale,
      setLocale,
      t: (key, params) =>
        interpolate(lookup(locale, key) ?? lookup("en", key) ?? key, params),
      formatNumber,
      localizeDigits,
      formatCurrency: (input, fractionDigits = 2) =>
        `${lookup(locale, "common.currencySymbol") ?? "৳"}${formatNumber(input, fractionDigits)}`,
      formatDate: (epochSeconds) => {
        if (!Number.isFinite(epochSeconds)) return "—";
        const date = new Date(epochSeconds * 1000);
        const month = lookup(locale, `months.${date.getMonth() + 1}`) ?? "";
        return localizeDigits(
          `${date.getDate()} ${month} ${date.getFullYear()}`,
        );
      },
      formatMonth: (month) =>
        lookup(locale, `months.${month}`) ?? String(month),
      formatYear: (year) => localizeDigits(String(Math.trunc(year))),
      localizePortalMonth: (portalMonth) => {
        // Same lookup the sort uses, so a month can never label one way and
        // order another.
        const month = portalMonthNumber(portalMonth);
        // The portal's own wording is a poor label, but it is a truthful one —
        // better than a dash where a month belongs.
        if (month === null) return portalMonth;
        return lookup(locale, `months.${month}`) ?? portalMonth;
      },
    };
  }, [locale, setLocale]);

  return <I18nContext value={value}>{children}</I18nContext>;
}

export function useI18n(): I18n {
  const context = use(I18nContext);
  if (!context) throw new Error("useI18n must be used inside <I18nProvider>.");
  return context;
}
