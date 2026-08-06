import type { TranslationKey } from '@/i18n';

export type ApiErrorKind = 'network' | 'timeout' | 'http';

/**
 * Every failure the client can produce, carrying a translation key rather than
 * a message. Screens render `t(error.messageKey)`, so an error surfaced in
 * Bangla stays in Bangla — a raw server string could not.
 */
export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | null;
  readonly messageKey: TranslationKey;
  /** The server's own message, kept for logs. Never rendered directly. */
  readonly serverMessage: string | null;

  constructor(init: {
    kind: ApiErrorKind;
    status?: number | null;
    messageKey: TranslationKey;
    serverMessage?: string | null;
  }) {
    super(init.serverMessage ?? init.messageKey);
    this.name = 'ApiError';
    this.kind = init.kind;
    this.status = init.status ?? null;
    this.messageKey = init.messageKey;
    this.serverMessage = init.serverMessage ?? null;
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }
}

export function messageKeyForStatus(status: number): TranslationKey {
  if (status === 401) return 'errors.unauthorized';
  if (status === 403) return 'errors.forbidden';
  if (status === 404) return 'errors.notFound';
  if (status === 409) return 'errors.conflict';
  if (status === 429) return 'errors.tooManyRequests';
  if (status >= 500) return 'errors.server';
  return 'errors.unknown';
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
