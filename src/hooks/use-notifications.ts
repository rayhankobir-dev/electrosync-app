import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { Notification } from '@/api/types';
import { useApi } from '@/session';

export const notificationKeys = {
  all: ['notifications'] as const,
};

/**
 * Polled on an interval because the bell is mounted on every tab screen and a
 * stale count is worse than a slightly chatty request — this is the fallback
 * for when a push never arrives or the app is foregrounded without one.
 */
const POLL_MS = 60_000;

export function useNotifications() {
  const api = useApi();

  return useQuery({
    queryKey: notificationKeys.all,
    queryFn: () => api.notifications.list(),
    refetchInterval: POLL_MS,
    refetchOnMount: true,
  });
}

/** Unread means never read. Archived notifications are not returned by default. */
export function unreadCount(notifications: readonly Notification[] | undefined): number {
  return (notifications ?? []).filter((item) => item.readAt === null).length;
}

export function useUnreadCount(): number {
  const { data } = useNotifications();
  return unreadCount(data);
}

export function useMarkNotificationRead() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.notifications.markAsRead(id),
    // Optimistic: the row should stop looking unread the instant it is tapped,
    // and the endpoint is idempotent so a lost response is harmless.
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });
      const previous = queryClient.getQueryData<Notification[]>(notificationKeys.all);

      queryClient.setQueryData<Notification[]>(notificationKeys.all, (current) =>
        (current ?? []).map((item) =>
          item.id === id && item.readAt === null
            ? { ...item, readAt: new Date().toISOString() }
            : item,
        ),
      );

      return { previous };
    },
    onError: (_error, _id, context) => {
      // Put the list back exactly as it was rather than refetching, so a failed
      // write does not also discard other in-flight optimistic updates.
      if (context?.previous) {
        queryClient.setQueryData(notificationKeys.all, context.previous);
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  });
}
