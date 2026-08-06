import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { UpdateUserSettingsPayload, UserSettings } from '@/api/types';
import { useApi } from '@/session';

export const userSettingsKeys = {
  all: ['user-settings'] as const,
};

/**
 * Shared by the settings screen and `useSettingsSync`, which reaches the same
 * key through `queryClient.fetchQuery` — one account-settings request per
 * launch rather than one per consumer.
 */
export function useUserSettings() {
  const api = useApi();

  return useQuery({
    queryKey: userSettingsKeys.all,
    queryFn: () => api.settings.get(),
  });
}

/**
 * Keyed so `onSettled` can count its own siblings. Toggling two switches in
 * quick succession puts two PATCHes in flight, and their responses can land in
 * either order — writing each response straight into the cache would let the
 * slower one restore the value the faster one just changed. Only the last
 * mutation to settle refetches, and that answer is authoritative for all of them.
 */
const mutationKey = ['user-settings', 'update'] as const;

export function useUpdateUserSettings() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey,
    mutationFn: (payload: UpdateUserSettingsPayload) => api.settings.update(payload),

    // Optimistic: a switch that waits for a round trip before moving reads as
    // broken, and every field here is a preference — a lost write costs nothing
    // that re-toggling cannot fix.
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: userSettingsKeys.all });
      const previous = queryClient.getQueryData<UserSettings>(userSettingsKeys.all);

      if (previous) {
        queryClient.setQueryData<UserSettings>(userSettingsKeys.all, {
          ...previous,
          ...payload,
        });
      }

      return { previous };
    },

    onError: (error: unknown, _payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData(userSettingsKeys.all, context.previous);
      }
      if (__DEV__) console.warn('Failed to save settings', error);
    },

    onSettled: () => {
      // Still counts this mutation, so 1 means nothing else is outstanding.
      if (queryClient.isMutating({ mutationKey }) > 1) return;
      return queryClient.invalidateQueries({ queryKey: userSettingsKeys.all });
    },
  });
}
