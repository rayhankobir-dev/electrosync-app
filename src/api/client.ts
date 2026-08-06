import { ApiError, messageKeyForStatus } from "./errors";

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";

const TIMEOUT_MS = 15_000;

export type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, string | number | boolean | undefined>;
  anonymous?: boolean;
  signal?: AbortSignal;
};

export type ApiClientConfig = {
  getToken(): string | null;
  onUnauthorized?(): void;
};

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  const url = `${API_BASE_URL}${path}`;
  if (!query) return url;

  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined) params.append(key, String(value));
  }

  const search = params.toString();
  return search ? `${url}?${search}` : url;
}

/**
 * Every request and response is logged in development. The client is the one
 * place all traffic passes through, so instrumenting here covers every endpoint
 * without touching a single screen or hook.
 *
 * Passwords are redacted and long tokens truncated — not to hide anything, but
 * because a full JWT per line makes the log unreadable, and a password in a log
 * is a bad habit even locally.
 */
function redact(value: unknown): unknown {
  if (typeof value === "string") {
    return value.length > 64
      ? `${value.slice(0, 24)}…[${value.length} chars]`
      : value;
  }
  if (Array.isArray(value)) return value.map(redact);
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) =>
        /password|secret/i.test(key) ? [key, "***"] : [key, redact(entry)],
      ),
    );
  }
  return value;
}

function logRequest(method: string, url: string, body: unknown): void {
  if (!__DEV__) return;
  if (body === undefined) console.log(`→ ${method} ${url}`);
  else console.log(`→ ${method} ${url}`, redact(body));
}

function logResponse(
  method: string,
  url: string,
  status: number,
  ms: number,
  payload: unknown,
): void {
  if (!__DEV__) return;
  const mark = status >= 400 ? "✗" : "✓";
  console.log(`${mark} ${status} ${method} ${url} (${ms}ms)`, redact(payload));
}

function logFailure(
  method: string,
  url: string,
  ms: number,
  reason: string,
): void {
  if (!__DEV__) return;
  console.log(`✗ --- ${method} ${url} (${ms}ms) ${reason}`);
}

function extractServerMessage(payload: unknown): string | null {
  if (typeof payload !== "object" || payload === null) return null;
  const message = (payload as { message?: unknown }).message;
  if (typeof message === "string") return message;
  if (Array.isArray(message))
    return message.filter((m) => typeof m === "string").join("\n");
  return null;
}

export function createApiClient(config: ApiClientConfig) {
  async function request<T>(
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    const { method = "GET", body, query, anonymous, signal } = options;

    const url = buildUrl(path, query);
    const startedAt = Date.now();
    logRequest(method, url, body);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
    const onExternalAbort = () => controller.abort();
    signal?.addEventListener("abort", onExternalAbort);

    const headers: Record<string, string> = { Accept: "application/json" };
    if (body !== undefined) headers["Content-Type"] = "application/json";

    if (!anonymous) {
      const token = config.getToken();
      if (token) headers.Authorization = `Bearer ${token}`;
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (cause) {
      const timedOut = controller.signal.aborted && !signal?.aborted;
      logFailure(
        method,
        url,
        Date.now() - startedAt,
        timedOut
          ? "TIMEOUT"
          : `NETWORK: ${cause instanceof Error ? cause.message : String(cause)}`,
      );

      throw new ApiError({
        kind: timedOut ? "timeout" : "network",
        messageKey: timedOut ? "errors.timeout" : "errors.network",
        serverMessage: cause instanceof Error ? cause.message : null,
      });
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", onExternalAbort);
    }

    if (response.status === 204) {
      logResponse(method, url, 204, Date.now() - startedAt, "(no content)");
      return undefined as T;
    }

    const raw = await response.text();
    const payload: unknown = raw ? safeParse(raw) : null;

    logResponse(method, url, response.status, Date.now() - startedAt, payload);

    if (!response.ok) {
      if (response.status === 401) {
        if (__DEV__)
          console.log(`  ↳ 401 on ${method} ${url} — clearing session`);
        config.onUnauthorized?.();
      }

      throw new ApiError({
        kind: "http",
        status: response.status,
        messageKey: messageKeyForStatus(response.status),
        serverMessage: extractServerMessage(payload),
      });
    }

    return payload as T;
  }

  return { request };
}

function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export type ApiClient = ReturnType<typeof createApiClient>;
