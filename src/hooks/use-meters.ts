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

/**
 * Keyed so `onSettled` can count its own siblings — two promotions tapped in
 * quick succession put two PATCHes in flight, and only the last one to settle
 * needs to refetch. Same reasoning as `useUpdateUserSettings`.
 */
const updateMeterKey = ["meters", "update"] as const;

/**
 * One meter with the payload applied, and nothing else touched.
 *
 * Spreading `payload` wholesale would be wrong: `MeterForm` sends
 * `label: undefined` whenever the field is empty, and `{ ...meter, ...payload }`
 * writes that `undefined` straight over a label the meter really has. The server
 * reads an omitted field as "leave it alone", so the optimistic copy has to as
 * well — otherwise editing a meter's type appears to erase its name until the
 * refetch puts it back.
 */
function patched(meter: Meter, payload: UpdateMeterPayload): Meter {
  return {
    ...meter,
    ...(payload.label !== undefined ? { label: payload.label } : {}),
    ...(payload.isPrimary !== undefined ? { isPrimary: payload.isPrimary } : {}),
  };
}

/**
 * The whole list as the server will have it once the PATCH lands.
 *
 * Promotion is not a one-row change. The server demotes the incumbent, and it
 * serves the primary meter first — so both have to be mirrored here. Skipping
 * the reorder is the more tempting mistake and the more visible one: the star
 * would fill instantly, then the row would jump to the top of the list a moment
 * later when the refetch arrived, giving one tap two separate movements.
 */
function withUpdate(
  meters: Meter[],
  id: string,
  payload: UpdateMeterPayload,
): Meter[] {
  const promoting = payload.isPrimary === true;

  const next = meters.map((meter) => {
    if (meter.id === id) return patched(meter, payload);
    return promoting && meter.isPrimary ? { ...meter, isPrimary: false } : meter;
  });

  if (!promoting) return next;

  // Sorts a fresh array from `map`, never the cached one. Stable, so everything
  // below the promoted meter keeps its order.
  return next.sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
}

export function useUpdateMeter() {
  const api = useApi();
  const queryClient = useQueryClient();

  return useMutation({
    mutationKey: updateMeterKey,
    mutationFn: ({ id, ...payload }: UpdateMeterPayload & { id: string }) =>
      api.meters.update(id, payload),

    /**
     * Optimistic, so the filled star appears on the tap rather than after a round
     * trip. Promotion is a preference with no destructive side effect — the worst
     * a lost write costs is a second tap.
     */
    onMutate: async ({ id, ...payload }) => {
      await queryClient.cancelQueries({ queryKey: meterKeys.all });
      const previous = queryClient.getQueryData<Meter[]>(meterKeys.all);

      if (previous) {
        queryClient.setQueryData<Meter[]>(
          meterKeys.all,
          withUpdate(previous, id, payload),
        );
      }

      return { previous };
    },

    onError: (_error, _payload, context) => {
      if (context?.previous) {
        queryClient.setQueryData(meterKeys.all, context.previous);
      }
    },

    // Promoting one meter demotes another, so a single-row update is not enough.
    onSettled: () => {
      // Still counts this mutation, so 1 means nothing else is outstanding.
      if (queryClient.isMutating({ mutationKey: updateMeterKey }) > 1) return;
      return queryClient.invalidateQueries({ queryKey: meterKeys.all });
    },
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
