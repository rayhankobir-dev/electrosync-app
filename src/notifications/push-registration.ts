import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import type { DevicePlatform } from "@/api/types";
import { prefsStorage } from "@/lib/storage";

const DEVICE_ID_KEY = "electrosync.deviceId";
const PUSH_TOKEN_KEY = "electrosync.pushToken";

const ANDROID_CHANNEL_ID = "default";

/**
 * What the OS will let through right now — four states rather than a boolean.
 *
 * `deniable` and `blocked` both mean "no notifications", but they need opposite
 * responses: the first can still be resolved by a prompt, the second only in the
 * system settings app. Collapsing them is what produces a control that appears
 * to do nothing when tapped.
 *
 * `unsupported` is deliberately also the fallback for an unreadable permission,
 * because unlike the other two it is *not* evidence that the user refused — see
 * `resolvePushPermission`.
 */
export type PushPermission =
  | "unsupported"
  | "granted"
  | "deniable"
  | "blocked";

export type PushRegistration = {
  token: string;
  platform: DevicePlatform;
  deviceId: string;
};

export type TokenResult =
  | { ok: true; registration: PushRegistration }
  | { ok: false; detail: string };

function currentPlatform(): DevicePlatform | null {
  if (Platform.OS === "ios") return "ios";
  if (Platform.OS === "android") return "android";
  return null;
}

/**
 * Stable for the life of the install. Exported because a token rotation has to
 * be reported under the same device id as the original registration, otherwise
 * the server ends up with two rows describing one handset.
 */
export async function stableDeviceId(): Promise<string> {
  const existing = await prefsStorage.get(DEVICE_ID_KEY);
  if (existing) return existing;

  const generated = [
    Device.modelName?.replace(/\s+/g, "-").toLowerCase() ?? "device",
    Date.now().toString(36),
    Math.random().toString(36).slice(2, 10),
  ].join("-");

  await prefsStorage.set(DEVICE_ID_KEY, generated);
  return generated;
}

/**
 * Creates the channel every push is addressed to.
 *
 * Two reasons this has to happen before anything else on Android: the OS
 * permission prompt is not shown on API 33+ until the app owns at least one
 * channel, and a push naming a channel that was never created is delivered at
 * the app's default importance, so it lands silently in the shade instead of
 * appearing as a heads-up alert — which is useless for a depleted meter.
 */
async function ensureAndroidChannel(name: string): Promise<void> {
  if (Platform.OS !== "android") return;

  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name,
    importance: Notifications.AndroidImportance.HIGH,
  });
}

/**
 * Reads — and, when asked to, requests — the OS notification permission.
 *
 * `prompt` is a parameter rather than an internal decision because the two
 * callers want opposite behaviour. The first pass after sign-in should ask. Every
 * later pass runs because the app returned to the foreground, where a dialog the
 * user did not initiate is indistinguishable from nagging.
 */
export async function resolvePushPermission({
  channelName,
  prompt,
}: {
  channelName: string;
  prompt: boolean;
}): Promise<PushPermission> {
  try {
    if (!currentPlatform() || !Device.isDevice) return "unsupported";

    await ensureAndroidChannel(channelName);

    const current = await Notifications.getPermissionsAsync();
    if (current.status === "granted") return "granted";

    // `canAskAgain` false is the OS saying it will not show the dialog again, so
    // calling `requestPermissionsAsync` here would return an instant denial and
    // burn the request without the user ever seeing anything.
    if (!current.canAskAgain) return "blocked";
    if (!prompt) return "deniable";

    const asked = await Notifications.requestPermissionsAsync();
    if (asked.status === "granted") return "granted";
    return asked.canAskAgain ? "deniable" : "blocked";
  } catch {
    // Reported as `unsupported`, not `blocked`, and the difference matters: the
    // caller retires the account's stored token on `blocked`. A permission we
    // failed to *read* is no evidence that the user refused, and treating it as
    // one would knock a working handset off the account over a transient fault.
    return "unsupported";
  }
}

/**
 * Assumes permission is already granted — call `resolvePushPermission` first.
 */
export async function fetchPushRegistration(): Promise<TokenResult> {
  const platform = currentPlatform();
  if (!platform) return { ok: false, detail: "unsupported platform" };

  try {
    // On Android this is the FCM registration token, which the native SDK can
    // only mint when the build carries a google-services.json — see
    // `android.googleServicesFile` in app.json. Without it this throws, and the
    // device is invisible to the backend no matter how the permission went.
    const devicePushToken = await Notifications.getDevicePushTokenAsync();

    return {
      ok: true,
      registration: {
        token: devicePushToken.data,
        platform,
        deviceId: await stableDeviceId(),
      },
    };
  } catch (error) {
    return {
      ok: false,
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * The local copy exists so the app can name the token it needs the server to
 * retire — on sign-out, and when the OS permission has gone away. It is
 * deliberately never used to decide whether registering is necessary: the client
 * cannot know whether the server still holds the row, and treating a local copy
 * as proof is what turns one lost row into a handset that never receives another
 * push.
 */
export async function rememberPushToken(token: string): Promise<void> {
  await prefsStorage.set(PUSH_TOKEN_KEY, token);
}

export async function storedPushToken(): Promise<string | null> {
  return prefsStorage.get(PUSH_TOKEN_KEY);
}

export async function forgetPushToken(): Promise<string | null> {
  const token = await prefsStorage.get(PUSH_TOKEN_KEY);
  await prefsStorage.remove(PUSH_TOKEN_KEY);
  return token;
}
