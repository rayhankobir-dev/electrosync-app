import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { userSettingsKeys } from '@/hooks/use-user-settings';
import { useI18n, type Locale } from '@/i18n';
import { useSession } from '@/session';
import { useTheme, type ThemeMode } from '@/theme';

/**
 * Reconciles the device's language and theme with the copies stored on the
 * account.
 *
 * Device-first: local state is applied instantly and the server is told
 * afterwards, so a slow or failed PATCH never makes the UI feel stuck. The one
 * exception is sign-in, where the account's stored preferences are pulled down
 * once and win — that is what makes the settings follow a user to a new device.
 */
export function useSettingsSync(): void {
  const { isAuthenticated, api } = useSession();
  const { locale, setLocale } = useI18n();
  const { mode, setMode } = useTheme();
  const queryClient = useQueryClient();

  const hydrated = useRef(false);
  /** Last values known to be on the server, to avoid echoing them straight back. */
  const remote = useRef<{ language: Locale; theme: ThemeMode } | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      hydrated.current = false;
      remote.current = null;
      return;
    }

    if (hydrated.current) return;
    hydrated.current = true;

    let cancelled = false;

    // Through the query cache rather than `api.settings.get()` directly, so the
    // settings screen's `useUserSettings` reads this response instead of
    // repeating the request.
    void queryClient
      .fetchQuery({
        queryKey: userSettingsKeys.all,
        queryFn: () => api.settings.get(),
      })
      .then((settings) => {
        if (cancelled) return;
        remote.current = { language: settings.language, theme: settings.theme };
        setLocale(settings.language);
        setMode(settings.theme);
      })
      .catch((error: unknown) => {
        // Offline sign-in: keep whatever the device already had and try again
        // on the next launch rather than blocking the app.
        hydrated.current = false;
        if (__DEV__) console.warn('Failed to load settings', error);
      });

    return () => {
      cancelled = true;
    };
  }, [api, isAuthenticated, queryClient, setLocale, setMode]);

  useEffect(() => {
    if (!isAuthenticated || !remote.current) return;
    if (remote.current.language === locale && remote.current.theme === mode) return;

    // Recorded before the request so a burst of rapid toggles does not queue a
    // PATCH per keystroke-equivalent.
    remote.current = { language: locale, theme: mode };

    void api.settings.update({ language: locale, theme: mode }).catch((error: unknown) => {
      if (__DEV__) console.warn('Failed to save settings', error);
    });
  }, [api, isAuthenticated, locale, mode]);
}
