import type { IconSvgElement } from '@hugeicons/react-native';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Fab, FabDiameter } from '@/components/ui/fab';
import { Text } from '@/components/ui/text';
import { HitSlop, Spacing, useTheme } from '@/theme';

/**
 * Derived from the navigator instead of imported: `expo-router` re-exports the
 * `Tabs` component but not the react-navigation types it vendors, and a deep
 * import into `expo-router/build/...` would break on any internal reshuffle.
 */
type TabBarProps = Parameters<NonNullable<ComponentProps<typeof Tabs>['tabBar']>>[0];

type TabBarOptions = TabBarProps['descriptors'][string]['options'];
type TabBarIcon = TabBarOptions['tabBarIcon'];

/**
 * `href: null` is how a nested route — `meter/[id]` — stays out of the bar.
 * expo-router implements it as `tabBarItemStyle: { display: 'none' }`, so a
 * hand-rolled bar has to check for it or detail routes turn into tabs.
 */
function isHidden(options: TabBarOptions): boolean {
  return StyleSheet.flatten(options.tabBarItemStyle)?.display === 'none';
}

/** How far the action button rises above the bar's top edge. */
const FAB_LIFT = 26;

/** Height of the icon + label row, before the bottom safe-area inset. */
export const TabBarHeight = 60;

export type TabBarAction = {
  icon: IconSvgElement;
  label: string;
  onPress(): void;
};

export type AppTabBarProps = TabBarProps;

/**
 * Bottom bar. Tabs are split into two groups around a gap in the middle, so the
 * floating action button lands at the exact centre regardless of how many tabs
 * there are.
 *
 * The button itself is not rendered here — see `FloatingTabAction`.
 */
export function AppTabBar({ state, descriptors, navigation, insets }: AppTabBarProps) {
  const { colors } = useTheme();

  // Indices are captured before filtering: `state.index` counts hidden routes
  // too, so comparing against a filtered position would light the wrong tab.
  const visible = state.routes
    .map((route, index) => ({ route, index }))
    .filter(({ route }) => !isHidden(descriptors[route.key].options));

  // Odd tab counts put the extra tab on the left, which keeps the visual weight
  // on the same side as the leading tab.
  const split = Math.ceil(visible.length / 2);

  const items = visible.map(({ route, index }) => (
    <TabItem
      key={route.key}
      label={descriptors[route.key].options.title ?? route.name}
      icon={descriptors[route.key].options.tabBarIcon}
      focused={state.index === index}
      onPress={() => {
        const event = navigation.emit({
          type: 'tabPress',
          target: route.key,
          canPreventDefault: true,
        });

        // A screen may cancel the press to scroll itself to the top instead.
        if (state.index !== index && !event.defaultPrevented) {
          navigation.navigate(route.name, route.params);
        }
      }}
      onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
    />
  ));

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: TabBarHeight + insets.bottom,
          paddingBottom: insets.bottom,
        },
      ]}>
      <View style={styles.group}>{items.slice(0, split)}</View>
      {/* Keeps the tabs clear of the disc that overlaps this edge. */}
      <View style={styles.actionGap} />
      <View style={styles.group}>{items.slice(split)}</View>
    </View>
  );
}

/**
 * The action button, floating over the tab bar and the screen behind it.
 *
 * Rendered by the layout as a sibling of the whole navigator rather than by the
 * bar, because the disc rises above the bar's top edge: on Android a child that
 * overflows its parent's bounds gets neither its shadow drawn out there nor any
 * touches delivered. As a full-screen overlay it has room for both — and the bar
 * no longer has to reserve a strip of dead space above itself, which is what was
 * pushing every screen's content up away from it.
 */
export function FloatingTabAction({ icon, label, onPress }: TabBarAction) {
  const insets = useSafeAreaInsets();

  return (
    <View
      // `box-none`: the overlay spans the width of the screen, so it must be
      // invisible to touches everywhere except on the disc itself.
      pointerEvents="box-none"
      style={[
        styles.actionSlot,
        // Measured from the bottom so the lift over the bar's top edge holds on
        // any inset. Positioning the top instead would need the screen height.
        { bottom: insets.bottom + TabBarHeight - FabDiameter + FAB_LIFT },
      ]}>
      <Fab icon={icon} label={label} onPress={onPress} />
    </View>
  );
}

function TabItem({
  label,
  icon,
  focused,
  onPress,
  onLongPress,
}: {
  label: string;
  icon: TabBarIcon;
  focused: boolean;
  onPress(): void;
  onLongPress(): void;
}) {
  const { colors } = useTheme();
  const tint = focused ? colors.primary : colors.textTertiary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: focused }}
      accessibilityLabel={label}
      hitSlop={HitSlop / 4}
      onPress={onPress}
      onLongPress={onLongPress}
      style={styles.item}>
      {icon?.({ focused, color: tint, size: 22 })}
      {/* The project's own Text, so the label picks up Hind Siliguri —
          react-navigation's built-in label would need the family threaded in by
          hand through `tabBarLabelStyle`. */}
      <Text variant="caption" color={focused ? 'primary' : 'textTertiary'} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  group: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  actionGap: {
    width: FabDiameter + Spacing.md,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    paddingHorizontal: Spacing.xs,
  },
  actionSlot: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
});
