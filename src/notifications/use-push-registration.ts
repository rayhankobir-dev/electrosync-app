import { useEffect, useRef } from "react";

import { useSession } from "@/session";

import {
  registerForPush,
  rememberPushToken,
  storedPushToken,
} from "./push-registration";

export function usePushRegistration(): void {
  const { isAuthenticated, api } = useSession();
  const attempted = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) {
      attempted.current = false;
      return;
    }

    if (attempted.current) return;
    attempted.current = true;

    let cancelled = false;

    void (async () => {
      const result = await registerForPush();

      if (cancelled) return;

      if (!result.ok) {
        // Never surfaced to the user: push is an enhancement, and a modal on
        // launch saying "no notifications on this simulator" helps nobody.
        if (__DEV__) {
          console.log(
            `[push] not registered — ${result.reason}`,
            result.detail ?? "",
          );
        }
        return;
      }

      const { token, platform, deviceId } = result.registration;

      if ((await storedPushToken()) === token) {
        if (__DEV__)
          console.log("[push] token unchanged, skipping re-register");
        return;
      }

      try {
        await api.notifications.registerToken({ token, platform, deviceId });
        await rememberPushToken(token);
        if (__DEV__) console.log(`[push] registered ${platform} token`);
      } catch (error) {
        // Allow a retry on the next launch rather than leaving the device
        // permanently unregistered because one request failed.
        attempted.current = false;
        if (__DEV__) console.warn("[push] failed to register token", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [api, isAuthenticated]);
}
