import type { Storage } from './storage';

/**
 * expo-secure-store has no web implementation, so on web both stores fall back
 * to localStorage. The access token is therefore readable by any script on the
 * origin — acceptable for local development, not for a shipped web build.
 */
function localStorageBacked(): Storage {
  return {
    async get(key) {
      try {
        return globalThis.localStorage?.getItem(key) ?? null;
      } catch {
        return null;
      }
    },
    async set(key, value) {
      try {
        globalThis.localStorage?.setItem(key, value);
      } catch {
        // Private-mode Safari throws on write; a lost preference is survivable.
      }
    },
    async remove(key) {
      try {
        globalThis.localStorage?.removeItem(key);
      } catch {
        // Same as above.
      }
    },
  };
}

export const secureStorage = localStorageBacked();
export const prefsStorage = localStorageBacked();
