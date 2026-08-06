import type { IconSvgElement } from "@hugeicons/react-native";
import { Pressable, StyleSheet, View } from "react-native";

import { HitSlop, Radius, Spacing, useTheme } from "@/theme";

import { Icon } from "./icon";
import { Text } from "./text";

export type TabOption<T extends string> = {
  value: T;
  label: string;
  /** Sits before the label, tinted with it. */
  icon: IconSvgElement;
};

/**
 * In-page tabs: icon + label per tab, with a rounded indicator under the active
 * one and a hairline rule across the full width.
 *
 * Distinct from `SegmentedControl` — the pill track there reads as a setting you
 * are changing (theme, language), while these read as views you are switching
 * between. Same data shape, different promise to the user.
 */
export function Tabs<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly TabOption<T>[];
  value: T;
  onChange(next: T): void;
}) {
  const { colors } = useTheme();

  return (
    <View accessibilityRole="tablist" style={styles.root}>
      {/* Drawn before the tabs so each active indicator paints over it. A
          `borderBottomWidth` on the container could not be overlapped: the
          border sits outside the content box its children are laid out in.

          `borderStrong`, not `border`: this rule sits on `background`, and
          `border` is within a few percent of it — the pair is meant for
          separating things *on* a card, where the surface behind is white. */}
      <View style={[styles.rule, { backgroundColor: colors.borderStrong }]} />

      {options.map((option) => {
        const selected = option.value === value;

        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            hitSlop={{ top: HitSlop / 4, bottom: HitSlop / 4 }}
            onPress={() => onChange(option.value)}
            style={styles.tab}
          >
            {/* Shrinks to its content so the indicator below can stretch to the
                label's width rather than the tab's. */}
            <View style={styles.cluster}>
              <View style={styles.labelRow}>
                <Icon
                  icon={option.icon}
                  size={18}
                  strokeWidth={selected ? 2 : 1.8}
                  color={selected ? "primary" : "textSecondary"}
                />
                <Text
                  variant="subhead"
                  color={selected ? "primary" : "textSecondary"}
                  numberOfLines={1}
                >
                  {option.label}
                </Text>
              </View>

              <View
                style={[
                  styles.indicator,
                  {
                    backgroundColor: selected ? colors.primary : "transparent",
                  },
                ]}
              />
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const INDICATOR_HEIGHT = 3;

/**
 * Not `StyleSheet.hairlineWidth`. That constant is tuned for *border* widths,
 * which RN snaps to the device pixel grid; as the `height` of a filled View it
 * is a sub-pixel box that antialiases into a faint smear, or rounds away to
 * nothing. A rule has to be given real pixels to be seen.
 */
const RULE_HEIGHT = 2;

const styles = StyleSheet.create({
  root: {
    flexDirection: "row",
    position: "relative",
  },
  rule: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: RULE_HEIGHT,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingTop: Spacing.xs,
    paddingHorizontal: Spacing.xs,
  },
  cluster: {
    alignItems: "center",
    gap: Spacing.sm,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs + 2,
  },
  indicator: {
    alignSelf: "stretch",
    height: INDICATOR_HEIGHT,
    borderTopLeftRadius: Radius.full,
    borderTopRightRadius: Radius.full,
  },
});
