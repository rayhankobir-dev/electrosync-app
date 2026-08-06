import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import type { AddMeterPayload, Meter, UpdateMeterPayload } from '@/api/types';
import { useApi } from '@/session';

export const meterKeys = {
  all: ['meters'] as const,
};

export function useMeters() {
  const api = useApi();

  return useQuery({
    queryKey: meterKeys.all,
    queryFn: () => api.meters.list(),
  });
}

/** The server returns primary first, so the head of the list is the default. */
export function usePrimaryMeter(): { meter: Meter | null; isLoading: boolean } {
  const { data, isLoading } = useMeters();
  return {
    meter: data?.find((m) => m.isPrimary) ?? data?.[0] ?? null,
    isLoading,
  };
}

export function useAddMeter() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AddMeterPayload) => api.meters.add(payload),
    // Adding the first meter also makes it primary server-side, so the whole
    // list has to be refetched rather than the new row appended.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: meterKeys.all }),
  });
}

export function useUpdateMeter() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, ...payload }: UpdateMeterPayload & { id: string }) =>
      api.meters.update(id, payload),
    // Promoting one meter demotes another, so a single-row update is not enough.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: meterKeys.all }),
  });
}

export function useRemoveMeter() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => api.meters.remove(id),
    // Deleting the primary promotes the oldest survivor server-side.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: meterKeys.all }),
  });
}
