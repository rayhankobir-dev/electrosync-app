import { useQueries, useQuery } from "@tanstack/react-query";

import type { Meter } from "@/api/types";
import { useApi } from "@/session";
import { utilityFor } from "@/utility";

/**
 * Keyed by utility as well as customer number: the same digits can belong to
 * two different meters across providers, and a shared key would serve one
 * meter's data for the other.
 *
 * There is deliberately no `balance` key. The info payload already carries
 * `currentBalance`, and every one of these routes is a live portal scrape —
 * fetching balance separately would scrape the same page twice for a number we
 * already hold, and let the two views drift out of sync.
 */
export const utilityKeys = {
  info: (meter: Meter) =>
    ["utility", meter.provider, meter.customerNo, "info"] as const,
  recharges: (meter: Meter) =>
    ["utility", meter.provider, meter.customerNo, "recharges"] as const,
  consumption: (meter: Meter) =>
    ["utility", meter.provider, meter.customerNo, "consumption"] as const,
};

export function useCustomerInfo(meter: Meter | null) {
  const api = useApi();
  const utility = meter ? utilityFor(meter.provider) : null;

  return useQuery({
    queryKey: meter ? utilityKeys.info(meter) : ["utility", "none", "info"],
    // Disabled rather than erroring for an unsupported utility: there is no
    // request to make, so there is no failure to report.
    enabled: Boolean(meter) && utility?.supported === true,
    queryFn: () => {
      if (!meter || !utility?.supported)
        throw new Error("unreachable: query disabled");
      return utility.fetchInfo(api, meter.customerNo);
    },
  });
}

export function useRecharges(meter: Meter | null) {
  const api = useApi();
  const utility = meter ? utilityFor(meter.provider) : null;

  return useQuery({
    queryKey: meter
      ? utilityKeys.recharges(meter)
      : ["utility", "none", "recharges"],
    enabled: Boolean(meter) && utility?.supported === true,
    queryFn: () => {
      if (!meter || !utility?.supported)
        throw new Error("unreachable: query disabled");
      return utility.fetchRecharges(api, meter.customerNo);
    },
  });
}

export function useConsumption(meter: Meter | null) {
  const api = useApi();
  const utility = meter ? utilityFor(meter.provider) : null;

  return useQuery({
    queryKey: meter
      ? utilityKeys.consumption(meter)
      : ["utility", "none", "consumption"],
    enabled: Boolean(meter) && utility?.supported === true,
    queryFn: () => {
      if (!meter || !utility?.supported)
        throw new Error("unreachable: query disabled");
      return utility.fetchConsumption(api, meter.customerNo);
    },
  });
}

export function isUnsupported(meter: Meter | null): boolean {
  return meter !== null && !utilityFor(meter.provider).supported;
}

/**
 * Customer info for a whole list of meters, fetched in parallel. Balance comes
 * from `info.currentBalance` — one request per meter, not two.
 *
 * `useQueries` is one hook call whatever the array length, so the meter count
 * can change between renders without breaking the rules of hooks.
 */
export function useMeterDetails(meters: readonly Meter[]) {
  const api = useApi();

  const infos = useQueries({
    queries: meters.map((meter) => {
      const utility = utilityFor(meter.provider);
      return {
        queryKey: utilityKeys.info(meter),
        enabled: utility.supported,
        queryFn: () => {
          if (!utility.supported)
            throw new Error("unreachable: query disabled");
          return utility.fetchInfo(api, meter.customerNo);
        },
      };
    }),
  });

  return meters.map((meter, index) => {
    const info = infos[index];
    return {
      meter,
      utility: utilityFor(meter.provider),
      info,
      balance: info.data?.currentBalance ?? null,
    };
  });
}

export type MeterDetail = ReturnType<typeof useMeterDetails>[number];
