import type { ImageSource } from "expo-image";

import type { Endpoints } from "@/api/endpoints";
import type {
  MeterProvider,
  NescoCustomerInfo,
  NescoMonthlyConsumption,
  NescoRecharge,
} from "@/api/types";

/**
 * Provider-neutral aliases. The wire shapes originate in the backend's `nesco`
 * module, but screens should not name a specific provider — when DESCO lands,
 * it conforms to these instead of the UI learning a second vocabulary.
 */
export type UtilityCustomerInfo = NescoCustomerInfo;
export type UtilityRecharge = NescoRecharge;
export type UtilityMonthlyConsumption = NescoMonthlyConsumption;

/**
 * No `fetchBalance`: the info payload already carries `currentBalance`, and
 * these routes are live portal scrapes, so a separate balance call would fetch
 * the same page twice. `api.nesco.balance` still exists if a cheaper
 * balance-only refresh is ever wanted.
 */
type Fetchers = {
  fetchInfo(api: Endpoints, customerNo: string): Promise<UtilityCustomerInfo>;
  fetchRecharges(
    api: Endpoints,
    customerNo: string,
  ): Promise<UtilityRecharge[]>;
  fetchConsumption(
    api: Endpoints,
    customerNo: string,
  ): Promise<UtilityMonthlyConsumption[]>;
};

/**
 * A discriminated union rather than optional methods: on an unsupported
 * provider the fetchers do not exist on the type at all, so the compiler — not
 * a runtime guard — is what stops a screen from calling them.
 */
type Identity = {
  provider: MeterProvider;
  displayName: string;
  /**
   * Brand wordmark, transparent background. Always render it on a light tile:
   * both marks are dark blue and would all but vanish against a dark theme, and
   * recolouring another company's logo is not ours to do.
   */
  logo: ImageSource;
};

export type UtilityAdapter =
  | (Identity & { supported: true } & Fetchers)
  | (Identity & { supported: false });

const NESCO: UtilityAdapter = {
  provider: "NESCO",
  displayName: "NESCO",
  logo: require("@/assets/images/meter/nesco.png") as ImageSource,
  supported: true,
  fetchInfo: (api, customerNo) => api.nesco.info(customerNo),
  fetchRecharges: (api, customerNo) => api.nesco.recharges(customerNo),
  fetchConsumption: (api, customerNo) => api.nesco.consumption(customerNo),
};

const DESCO: UtilityAdapter = {
  provider: "DESCO",
  displayName: "DESCO",
  logo: require("@/assets/images/meter/desco.png") as ImageSource,
  supported: false,
};

const DPDC: UtilityAdapter = {
  provider: "DPDC",
  displayName: "DPDC",
  logo: require("@/assets/images/meter/dpdc.png") as ImageSource,
  supported: false,
};

const REGISTRY: Record<MeterProvider, UtilityAdapter> = {
  NESCO,
  DESCO,
  DPDC,
};

export const UTILITIES: readonly UtilityAdapter[] = [NESCO, DESCO, DPDC];

export function utilityFor(provider: MeterProvider): UtilityAdapter {
  return REGISTRY[provider];
}
