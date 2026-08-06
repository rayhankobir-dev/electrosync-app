import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import type { DevicePlatform } from "@/api/types";
import { prefsStorage } from "@/lib/storage";

const DEVICE_ID_KEY = "electrosync.deviceId";
const PUSH_TOKEN_KEY = "electrosync.pushToken";

export type PushRegistration = {
  token: string;
  platform: DevicePlatform;
  deviceId: string;
};

export type PushFailure =
  | "unsupported-platform"
  | "simulator"
  | "permission-denied"
  | "token-unavailable";

export type PushResult =
  | { ok: true; registration: PushRegistration }
  | { ok: false; reason: PushFailure; detail?: string };

function currentPlatform(): DevicePlatform | null {
  if (Platform.OS === "ios") return "ios";
  if (Platform.OS === "android") return "android";
  return null;
}

async function deviceId(): Promise<string> {
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

export async function registerForPush(): Promise<PushResult> {
  const platform = currentPlatform();
  if (!platform) return { ok: false, reason: "unsupported-platform" };
  if (!Device.isDevice) return { ok: false, reason: "simulator" };

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;

  if (status !== "granted") {
    if (!existing.canAskAgain)
      return { ok: false, reason: "permission-denied" };
    status = (await Notifications.requestPermissionsAsync()).status;
  }

  if (status !== "granted") return { ok: false, reason: "permission-denied" };

  try {
    const devicePushToken = await Notifications.getDevicePushTokenAsync();
    return {
      ok: true,
      registration: {
        token: devicePushToken.data,
        platform,
        deviceId: await deviceId(),
      },
    };
  } catch (error) {
    return {
      ok: false,
      reason: "token-unavailable",
      detail: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function rememberPushToken(token: string): Promise<void> {
  await prefsStorage.set(PUSH_TOKEN_KEY, token);
}

export async function forgetPushToken(): Promise<string | null> {
  const token = await prefsStorage.get(PUSH_TOKEN_KEY);
  await prefsStorage.remove(PUSH_TOKEN_KEY);
  return token;
}

export async function storedPushToken(): Promise<string | null> {
  return prefsStorage.get(PUSH_TOKEN_KEY);
}
