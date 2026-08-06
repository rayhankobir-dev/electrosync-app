/**
 * Kept in its own module so the theme's font resolution can depend on the
 * locale union without importing the provider (which would form a cycle).
 *
 * The two values match the `language` field the backend accepts on
 * `PATCH /users/me/settings`.
 */
export const LOCALES = ['en', 'bn'] as const;

export type Locale = (typeof LOCALES)[number];

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}
