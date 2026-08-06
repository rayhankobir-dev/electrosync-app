/**
 * Deliberately permissive — the server does the authoritative check with
 * class-validator's `@IsEmail`. This only exists to catch obvious typos before
 * spending a round trip.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

/** Matches `@MinLength(8)` on the backend's RegisterDto. */
export const MIN_PASSWORD_LENGTH = 8;

/** Matches `@Min(0) @Max(100_000)` on `UpdateUserSettingsDto.lowBalanceThreshold`. */
export const THRESHOLD_MIN = 0;
export const THRESHOLD_MAX = 100_000;

/** U+09E6 BENGALI DIGIT ZERO. ০-৯ occupy the ten code points from here. */
const BENGALI_ZERO = 0x09e6;

/**
 * Rewrites ০-৯ as 0-9, leaving everything else alone.
 *
 * Needed wherever a digit string is sent to the backend rather than parsed into
 * a number: a Bengali keyboard layout produces ০-৯ from a `number-pad`, and the
 * server validates digits with `\d`, which does not match them.
 *
 * Distinct from `parseWholeAmount` because that returns a number, and a number
 * cannot carry a leading zero — the reset code `০০৪২` has to survive as
 * `"0042"`, not become `42`.
 */
export function toLatinDigits(input: string): string {
  return input.replace(/[০-৯]/g, (digit) =>
    String(digit.charCodeAt(0) - BENGALI_ZERO),
  );
}

/** Matches `@Matches(/^\d{6}$/)` on the backend's ResetPasswordDto. */
export const RESET_CODE_LENGTH = 6;

/** Expects digits already normalised by `toLatinDigits`. */
export function isValidResetCode(value: string): boolean {
  return new RegExp(`^\\d{${RESET_CODE_LENGTH}}$`).test(value.trim());
}

/**
 * Parses a whole amount typed in either digit set, or `null` if the text is not
 * one. Bengali digits have to be handled explicitly: `number-pad` yields Latin
 * digits on most systems, but a Bengali keyboard layout gives ০-৯ and
 * `Number('১০০')` is `NaN` — which would read as "invalid" to a user who typed
 * a perfectly good number.
 *
 * Rejects rather than strips anything that is not a digit, so `12.5` fails
 * loudly instead of silently becoming 125 against the backend's `@IsInt`.
 */
export function parseWholeAmount(input: string): number | null {
  const latin = input.replace(/[০-৯]/g, (digit) =>
    String(digit.charCodeAt(0) - BENGALI_ZERO),
  );

  const trimmed = latin.trim();
  if (!/^\d+$/.test(trimmed)) return null;

  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

/**
 * Digits in either script, and the punctuation people actually type between
 * them. Bengali digits belong here for the same reason `parseWholeAmount`
 * handles them: the Bangla placeholder for this field is `+৮৮০১৭০০০০০০০০`, so
 * rejecting ০-৯ would fail the very number we show as the example.
 */
const MOBILE_SHAPE = /^\+?[\d০-৯\s-]+$/;

/**
 * Also deliberately permissive. The backend only bounds the length, and numbers
 * are entered every way at once — `+8801700000000`, `01700000000`, with spaces
 * or dashes — so this only rejects what cannot be a phone number at all.
 *
 * Callers decide what an empty string means; here it is not a number.
 */
export function isValidMobile(value: string): boolean {
  const trimmed = value.trim();
  if (!MOBILE_SHAPE.test(trimmed)) return false;

  // 15 is E.164's maximum for a full international number.
  const digits = trimmed.replace(/[^\d০-৯]/g, '').length;
  return digits >= 6 && digits <= 15;
}
