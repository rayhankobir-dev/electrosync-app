import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { createApiClient } from '@/api/client';
import { createEndpoints, type Endpoints } from '@/api/endpoints';
import { ApiError } from '@/api/errors';
import type {
  LoginPayload,
  RegisterPayload,
  UpdateProfilePayload,
  UserProfile,
} from '@/api/types';
import { secureStorage } from '@/lib/storage';
import { forgetPushToken } from '@/notifications/push-registration';

const TOKEN_KEY = 'electrosync.accessToken';
const EXPIRY_KEY = 'electrosync.accessTokenExpiresAt';

type StoredToken = { token: string; expiresAt: number };

export type Session = {
  /** True until the stored token has been read from disk. Gate routing on it. */
  isRestoring: boolean;
  isAuthenticated: boolean;
  user: UserProfile | null;
  api: Endpoints;
  signIn(payload: LoginPayload): Promise<void>;
  signUp(payload: RegisterPayload): Promise<void>;
  signOut(): Promise<void>;
  /**
   * Saves the editable parts of the profile and adopts the server's answer as
   * the new `user`.
   *
   * It lives here rather than in a query hook because the profile *is* session
   * state: the home greeting and the account card read `user` directly, so a
   * copy cached anywhere else would leave them showing the old name.
   */
  updateProfile(payload: UpdateProfilePayload): Promise<void>;
};

const SessionContext = createContext<Session | null>(null);

async function readStoredToken(): Promise<StoredToken | null> {
  const [token, expiresAtRaw] = await Promise.all([
    secureStorage.get(TOKEN_KEY),
    secureStorage.get(EXPIRY_KEY),
  ]);

  if (!token) return null;

  // There is no refresh endpoint, so an expired token is worthless — drop it
  // rather than letting the first request fail with a 401.
  const expiresAt = Number(expiresAtRaw);
  if (Number.isFinite(expiresAt) && expiresAt <= Date.now()) return null;

  return { token, expiresAt };
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);

  // The client reads the token through a ref so it always sees the current
  // value without the client itself being rebuilt on every sign-in.
  const tokenRef = useRef<string | null>(null);
  tokenRef.current = token;

  const clearSession = useCallback(async () => {
    setToken(null);
    setUser(null);
    await Promise.all([secureStorage.remove(TOKEN_KEY), secureStorage.remove(EXPIRY_KEY)]);
  }, []);

  const api = useMemo(
    () =>
      createEndpoints(
        createApiClient({
          getToken: () => tokenRef.current,
          onUnauthorized: () => {
            // The token is gone or revoked. Dropping it flips the route guard,
            // which is what actually returns the user to the sign-in screen.
            void clearSession();
          },
        }),
      ),
    [clearSession],
  );

  const persistToken = useCallback(async (accessToken: string, expiresIn: number) => {
    const expiresAt = Date.now() + expiresIn * 1000;
    setToken(accessToken);
    await Promise.all([
      secureStorage.set(TOKEN_KEY, accessToken),
      secureStorage.set(EXPIRY_KEY, String(expiresAt)),
    ]);
  }, []);

  useEffect(() => {
    let cancelled = false;

    void readStoredToken()
      .then((stored) => {
        if (!cancelled && stored) setToken(stored.token);
      })
      .finally(() => {
        if (!cancelled) setIsRestoring(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Profile follows the token. A 401 here is already handled by the client's
  // onUnauthorized hook, so only unexpected failures need swallowing.
  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }

    let cancelled = false;

    void api.auth
      .me()
      .then((profile) => {
        if (!cancelled) setUser(profile);
      })
      .catch((error: unknown) => {
        if (!(error instanceof ApiError) || !error.isUnauthorized) {
          // Offline with a valid token: stay signed in, just without a profile.
          if (__DEV__) console.warn('Failed to load profile', error);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [api, token]);

  const value = useMemo<Session>(
    () => ({
      isRestoring,
      isAuthenticated: token !== null,
      user,
      api,
      signIn: async (payload) => {
        const issued = await api.auth.login(payload);
        await persistToken(issued.accessToken, issued.expiresIn);
      },
      signUp: async (payload) => {
        const issued = await api.auth.register(payload);
        await persistToken(issued.accessToken, issued.expiresIn);
      },
      updateProfile: async (payload) => {
        // The PATCH response is the whole profile, so there is nothing to
        // refetch — adopting it directly keeps the round trips at one.
        setUser(await api.users.updateProfile(payload));
      },
      signOut: async () => {
        // Revoke the push token first: the DELETE needs the access token, so
        // clearing the session ahead of it would make the request 401 and leave
        // a dead device row that keeps receiving this user's notifications.
        const pushToken = await forgetPushToken();
        if (pushToken) {
          try {
            await api.notifications.unregisterToken(pushToken);
          } catch (error) {
            // Signing out must not be blocked by a failed cleanup — the server
            // prunes tokens FCM reports as invalid anyway.
            if (__DEV__) console.warn('Failed to unregister push token', error);
          }
        }

        await clearSession();
      },
    }),
    [api, clearSession, isRestoring, persistToken, token, user],
  );

  return <SessionContext value={value}>{children}</SessionContext>;
}

export function useSession(): Session {
  const context = use(SessionContext);
  if (!context) throw new Error('useSession must be used inside <SessionProvider>.');
  return context;
}

/** Shorthand for screens that only need to call the backend. */
export function useApi(): Endpoints {
  return useSession().api;
}
