import * as Notifications from "expo-notifications";
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AppState, Linking } from "react-native";

import { isApiError } from "@/api/errors";
import type { DevicePlatform } from "@/api/types";
import { useI18n } from "@/i18n";
import { useSession } from "@/session";

import {
  fetchPushRegistration,
  forgetPushToken,
  rememberPushToken,
  resolvePushPermission,
  stableDeviceId,
  storedPushToken,
  type PushPermission,
} from "./push-registration";

/**
 * Deliberately not gated on `__DEV__`.
 *
 * A `preview` or `production` EAS build is a release build, so `__DEV__` is false
 * and the bundler strips anything behind it — removing every trace of why push
 * failed from precisely the builds that run on real handsets, where it is the
 * only thing that can be inspected (`adb logcat -s ReactNativeJS`). The cost is a
 * few lines per launch and the last 8 characters of a token, which is not a
 * credential on its own.
 */
function log(message: string, detail?: unknown): void {
  if (detail === undefined) console.log(`[push] ${message}`);
  else console.log(`[push] ${message}`, detail);
}

/** Narrows the rotation listener's token type, which is wider than the API takes. */
function nativePlatform(type: string): DevicePlatform | null {
  return type === "ios" || type === "android" ? type : null;
}

export type Push = {
  /** Null until the first evaluation lands, so the UI can stay quiet meanwhile. */
  permission: PushPermission | null;
  /**
   * The OS is refusing alerts *and* the user can do something about it.
   *
   * False for `unsupported`, which is a simulator or a platform without push:
   * true there would show a warning with no remedy behind it.
   */
  isBlocked: boolean;
  /** Prompts, or opens system settings when the OS will not ask again. */
  enable(): Promise<void>;
};

const PushContext = createContext<Push | null>(null);

/**
 * Owns whether this handset can receive a push, and keeps the account's
 * `device_token` row honest about it.
 *
 * A provider rather than a hook because two consumers need the same answer and
 * they must not diverge: the sync below decides what the server is told, and the
 * settings screen decides what the user is shown. Two independent permission
 * reads would eventually disagree, and the disagreement would look exactly like
 * the bug this replaces — a switch reading "on" over a channel that is dead.
 */
export function PushProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, api } = useSession();
  const { t } = useI18n();
  const [permission, setPermission] = useState<PushPermission | null>(null);

  // User-visible in Android's system settings, so it has to follow the locale.
  const channelName = t("notifications.channelName");

  /** The token the server is known to hold, for this run of the app. */
  const registered = useRef<string | null>(null);
  const prompted = useRef(false);

  const publish = useCallback(
    async (token: string, platform: DevicePlatform, deviceId: string) => {
      if (registered.current === token) return;

      await api.notifications.registerToken({ token, platform, deviceId });
      await rememberPushToken(token);
      registered.current = token;
      log(`registered ${platform} token …${token.slice(-8)}`);
    },
    [api],
  );

  /**
   * Marks this handset unreachable on the account.
   *
   * This is the half that was missing. Revoking the OS permission does not
   * invalidate an FCM token, so without this the server keeps sending, FCM keeps
   * reporting success, and Android silently discards every alert — a failure
   * invisible from both ends. Flipping `is_active` off makes `sendToUser` report
   * `pushAttempted: false` instead of a delivery that never happened.
   */
  const retire = useCallback(async () => {
    registered.current = null;

    const stale = await storedPushToken();
    if (!stale) return;

    try {
      await api.notifications.unregisterToken(stale);
    } catch (error) {
      // 404 is the intended end state reached by another route — the row is
      // already gone. Anything else has to leave the local copy in place so the
      // next foreground can try again.
      if (!isApiError(error) || error.status !== 404) throw error;
    }

    await forgetPushToken();
    log("retired token — the OS is no longer allowing notifications");
  }, [api]);

  /**
   * Runs one pass at a time, in call order.
   *
   * Not a micro-optimisation — an unserialised pass can corrupt the server
   * record. Presenting the OS permission dialog can itself bounce the app
   * through `inactive` → `active`, so the foreground pass starts while the
   * prompt is still open, reads the not-yet-answered permission as a refusal,
   * and retires the token the prompt is a moment away from making valid. Whether
   * that `DELETE` lands before or after the `POST` is then down to network
   * timing, and half the time the handset ends up inactive while working
   * perfectly.
   *
   * Queued rather than deduplicated so a deliberate tap on `enable` is never
   * answered by an in-flight pass that was told not to prompt.
   */
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  const enqueue = useCallback(
    (task: () => Promise<PushPermission>): Promise<PushPermission> => {
      const next = queue.current.then(task, task);
      // Swallowed on the queue's own copy only: the caller still sees the
      // rejection, but one failed pass must not poison every later one.
      queue.current = next.catch(() => undefined);
      return next;
    },
    [],
  );

  const perform = useCallback(
    async (prompt: boolean): Promise<PushPermission> => {
      const state = await resolvePushPermission({ channelName, prompt });
      setPermission(state);

      if (state === "granted") {
        const result = await fetchPushRegistration();
        if (result.ok) {
          const { token, platform, deviceId } = result.registration;
          await publish(token, platform, deviceId);
        } else {
          log("permission granted but no token available", result.detail);
        }
        return state;
      }

      // Only these two mean the user actually refused. `unsupported` covers a
      // simulator and an unreadable permission, neither of which is evidence
      // that the account's stored token stopped working.
      if (state === "deniable" || state === "blocked") await retire();

      return state;
    },
    [channelName, publish, retire],
  );

  const sync = useCallback(
    (prompt: boolean) => enqueue(() => perform(prompt)),
    [enqueue, perform],
  );

  // The first pass after sign-in is the only one allowed to prompt.
  useEffect(() => {
    if (!isAuthenticated || prompted.current) return;
    prompted.current = true;

    void sync(true).catch((error: unknown) => log("initial sync failed", error));
  }, [isAuthenticated, sync]);

  // Re-checked on every return to the foreground, because both things that
  // revoke this permission happen while the app is not running and neither
  // notifies it: the user turning notifications off in system settings, and
  // Android hibernating an app left unused for ~2 months, which auto-resets its
  // runtime permissions and is not re-granted on wake. An alerting app is
  // exactly the app a user stops opening, so that second one is not an edge case.
  useEffect(() => {
    if (!isAuthenticated) return;

    const subscription = AppState.addEventListener("change", (next) => {
      if (next !== "active") return;

      void sync(false).catch((error: unknown) =>
        log("foreground sync failed", error),
      );
    });

    return () => subscription.remove();
  }, [isAuthenticated, sync]);

  // FCM issues a new token on its own schedule — after a device restore, an app
  // data clear, or a long idle period. The passes above only run on a cold start
  // or a foreground, so without this the server keeps pushing to a token the
  // handset has already discarded.
  useEffect(() => {
    if (!isAuthenticated) return;

    const subscription = Notifications.addPushTokenListener((next) => {
      const platform = nativePlatform(next.type);
      const token = next.data;
      if (!platform || typeof token !== "string") return;

      void (async () => {
        try {
          await publish(token, platform, await stableDeviceId());
        } catch (error) {
          log("failed to send rotated token", error);
        }
      })();
    });

    return () => subscription.remove();
  }, [isAuthenticated, publish]);

  const enable = useCallback(async () => {
    const state = await sync(true);

    // `sync` has already shown the prompt if one was still available, so landing
    // on `blocked` means the OS refused to ask. System settings is the only way
    // back from there — and the only way to undo a hibernation revocation.
    if (state === "blocked") await Linking.openSettings();
  }, [sync]);

  const value = useMemo<Push>(
    () => ({
      permission,
      isBlocked: permission === "deniable" || permission === "blocked",
      enable,
    }),
    [enable, permission],
  );

  return <PushContext value={value}>{children}</PushContext>;
}

export function usePush(): Push {
  const context = use(PushContext);
  if (!context) throw new Error("usePush must be used inside <PushProvider>.");
  return context;
}
