import {
  BatteryCharging01Icon,
  BatteryEmptyIcon,
  BatteryLowIcon,
  ChartHistogramIcon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react-native";

import type { Notification } from "@/api/types";
import type { TranslationKey } from "@/i18n";
import type { ColorName } from "@/theme";

/**
 * Per-kind presentation for the rows the balance sweep produces. The kind rides
 * in the notification's untyped `data` bag (see the backend's `push()`), so it
 * is narrowed at runtime rather than typed on `Notification`.
 *
 * `tone` names a theme colour that also has a `${tone}Soft` companion — the
 * pair is what lets a card tint and its icon badge stay in step across light
 * and dark.
 *
 * Lifted out of the notifications screen once the filter row needed the same
 * icons and names: two copies of this table would drift the moment a fourth
 * kind is added, and the filter would quietly stop offering it.
 */
export const ALERT_STYLES = {
  LOW_BALANCE: {
    icon: BatteryLowIcon,
    tone: "warning",
    labelKey: "notifications.kinds.lowBalance",
  },
  BALANCE_DEPLETED: {
    icon: BatteryEmptyIcon,
    tone: "danger",
    labelKey: "notifications.kinds.depleted",
  },
  RECHARGE_DETECTED: {
    icon: BatteryCharging01Icon,
    tone: "success",
    labelKey: "notifications.kinds.recharged",
  },
  /**
   * `warning`, not `danger`: using more than usual is worth a look, but it is
   * not a fault and nothing is about to be cut off. `danger` is reserved for
   * a depleted meter, which is.
   */
  USAGE_ANOMALY: {
    icon: ChartHistogramIcon,
    tone: "warning",
    labelKey: "notifications.kinds.unusualUsage",
  },
} as const satisfies Record<
  string,
  { icon: IconSvgElement; tone: ColorName; labelKey: TranslationKey }
>;

export type AlertKind = keyof typeof ALERT_STYLES;

/**
 * Derived from the table rather than written out again, so a new kind reaches
 * the filter row by adding one entry above and nothing else.
 */
export const ALERT_KINDS = Object.keys(ALERT_STYLES) as readonly AlertKind[];

export function alertKind(data: Notification["data"]): AlertKind | null {
  const kind = data?.kind;
  return typeof kind === "string" && kind in ALERT_STYLES
    ? (kind as AlertKind)
    : null;
}
