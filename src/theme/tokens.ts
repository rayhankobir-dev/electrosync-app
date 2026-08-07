/**
 * Design tokens. Every colour, size and radius in the app resolves from here —
 * screens never hardcode a hex value.
 *
 * The palette is built around the blue already used by the splash screen
 * (#208AEF), toned down slightly so large fills do not vibrate. Elevation is
 * expressed with borders rather than shadows: shadows read as noise in dark
 * mode, and borders survive both schemes unchanged.
 */

const palette = {
  light: {
    /** App background, behind everything. */
    background: "#F7F8FA",
    /** Cards, sheets, inputs. */
    surface: "#FFFFFF",
    /** A surface that needs to sit above another surface. */
    surfaceRaised: "#FFFFFF",
    /** Pressed/hover state for surfaces. */
    surfacePressed: "#EFF1F4",

    border: "#E6E8EC",
    borderStrong: "#D3D7DE",

    text: "#0D1117",
    textSecondary: "#5B6472",
    textTertiary: "#8A93A2",
    textInverse: "#FFFFFF",

    primary: "#1B7FE0",
    primaryPressed: "#1668B8",
    primarySoft: "#E8F2FD",
    onPrimary: "#FFFFFF",

    success: "#0E9F6E",
    successSoft: "#E6F6F0",
    warning: "#C77700",
    warningSoft: "#FDF3E4",
    danger: "#DC2B2B",
    dangerSoft: "#FDECEC",

    /** Skeleton / placeholder fill. */
    skeleton: "#E9ECF0",
  },
  dark: {
    background: "#0B0E13",
    surface: "#141920",
    surfaceRaised: "#1B212A",
    surfacePressed: "#1F2630",

    border: "#242B35",
    borderStrong: "#333C48",

    text: "#F2F4F7",
    textSecondary: "#9AA4B2",
    textTertiary: "#6B7684",
    textInverse: "#0B0E13",

    primary: "#4D9FF0",
    primaryPressed: "#3D89D6",
    primarySoft: "#12283D",
    onPrimary: "#06121F",

    success: "#2FBF8F",
    successSoft: "#0C2A22",
    warning: "#E0A63C",
    warningSoft: "#2C2211",
    danger: "#F16565",
    dangerSoft: "#331616",

    skeleton: "#1C222B",
  },
} as const;

export type ColorScheme = keyof typeof palette;
export type Colors = (typeof palette)[ColorScheme];
export type ColorName = keyof Colors;

export const Palette = palette;

/**
 * A palette colour at reduced opacity.
 *
 * For washes and hairlines that should read as the same hue without competing
 * with it — a tinted card's border, where the full-strength tone outlines the
 * card too loudly but a neutral grey makes it look unrelated to its own fill.
 *
 * Works by appending the alpha byte: every value in the palette is 6-digit hex,
 * and React Native accepts `#RRGGBBAA`. Note the result blends with whatever is
 * *behind* it, which for a border is the view's own `backgroundColor` — so
 * tinting a tone against its own soft fill lands on a deeper shade of the same
 * family rather than on a washed-out grey.
 */
export function withAlpha(color: string, alpha: number): string {
  const byte = Math.round(Math.min(Math.max(alpha, 0), 1) * 255);
  return `${color}${byte.toString(16).padStart(2, "0")}`;
}

/** 4pt grid. Named by step so intent survives a redesign of the values. */
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  "2xl": 32,
  "3xl": 48,
} as const;

export const Radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
} as const;

/**
 * Type scale. `weight` maps to a font file rather than a numeric `fontWeight`,
 * because custom families on Android ignore synthetic weights — the family
 * name itself has to carry the weight.
 */
export const TypeScale = {
  display: { size: 40, lineHeight: 48, weight: "700" },
  title1: { size: 28, lineHeight: 36, weight: "700" },
  title2: { size: 22, lineHeight: 30, weight: "600" },
  title3: { size: 18, lineHeight: 26, weight: "600" },
  body: { size: 16, lineHeight: 24, weight: "400" },
  bodyMedium: { size: 16, lineHeight: 24, weight: "500" },
  callout: { size: 15, lineHeight: 22, weight: "400" },
  subhead: { size: 14, lineHeight: 20, weight: "500" },
  footnote: { size: 13, lineHeight: 18, weight: "400" },
  caption: { size: 12, lineHeight: 16, weight: "500" },
  /**
   * Caption at semibold. For short labels that have to hold their own against a
   * filled background — table column headers — without going up a size and
   * competing with the data underneath.
   */
  captionStrong: { size: 12, lineHeight: 16, weight: "600" },
  /**
   * Smallest step, and the only one below the app's comfortable reading size.
   * Reserved for short overlay labels — a badge floating on a card, where a
   * `caption` would crowd the artwork it sits on. Never for prose.
   */
  micro: { size: 10, lineHeight: 14, weight: "600" },
} as const;

export type TypeVariant = keyof typeof TypeScale;
export type FontWeight = (typeof TypeScale)[TypeVariant]["weight"];

/**
 * Bengali needs more vertical room than Latin at the same point size.
 * Above-base vowel signs (ি, ী, ৈ, ৗ) and the reph ascend far past Latin
 * cap-height, so a line height sized for Latin crops them — and a clipped ি
 * reads as a different mark, which looks like broken shaping rather than
 * cropping.
 *
 * Not a taste value: this is Hind Siliguri's own line box, read from the font's
 * OS/2 table — winAscent 1116 + winDescent 501 over a 1000 unitsPerEm is
 * 1.617em. Android lays a line out in exactly that box, and treats an explicit
 * `lineHeight` as a hard limit, so any value below it crops the glyph rather
 * than tightening the leading. Rounded up to 1.62 to stay clear of it.
 *
 * Applied per script rather than per font, even though one family now sets
 * both: no Latin glyph in it reaches past 1.5em, so English lines stay on the
 * tighter rhythm of `TypeScale` instead of carrying leading only the Bengali
 * marks ever asked for. The number itself is still the family's, so it has to
 * move if the family ever does.
 */
const BENGALI_LINE_HEIGHT_RATIO = 1.62;

/**
 * Line height for a variant in a given locale. Never returns less than the
 * Latin value, so switching to Bangla can only ever add space.
 */
export function resolveLineHeight(
  variant: TypeVariant,
  locale: string,
): number {
  const { size, lineHeight } = TypeScale[variant];
  if (locale !== "bn") return lineHeight;

  /**
   * `ceil`, not `round`. Rounding to nearest lands *under* the font's line box
   * at several sizes in this scale — `callout` at 15pt needs 24.25px and rounds
   * to 24, `caption` at 12pt needs 19.40 and rounds to 19, `micro` at 10pt
   * needs 16.17 and rounds to 16 — and a fraction of a pixel is enough to shave
   * the top row off a ী or a reph. Rounding up costs at most a pixel of leading
   * and can never crop.
   */
  return Math.max(lineHeight, Math.ceil(size * BENGALI_LINE_HEIGHT_RATIO));
}

/** Minimum touch target, per both Apple HIG and Material guidance. */
export const HitSlop = 44;

export const MaxContentWidth = 560;
