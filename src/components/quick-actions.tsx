import type { IconSvgElement } from "@hugeicons/react-native";
import { Pressable, StyleSheet, View } from "react-native";

import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { Radius, Spacing, useTheme } from "@/theme";

export type QuickAction = {
  /** Stable list key. The label cannot serve — it changes with the locale. */
  key: string;
  icon: IconSvgElement;
  label: string;
  onPress(): void;
};

/**
 * A row of shortcut tiles inside a card.
 *
 * Deliberately knows nothing about where its actions lead: the caller passes
 * `onPress`, so routing stays in the screen that owns the route params. That is
 * what lets the same component sit on a screen with a meter and one without,
 * with a different set of tiles each time.
 */
export function QuickActions({
  title,
  actions,
}: {
  title: string;
  actions: readonly QuickAction[];
}) {
  if (actions.length === 0) return null;

  return (
    <Card>
      {/* <Text variant="caption" color="textTertiary" style={styles.title}>
        {title.toUpperCase()}
      </Text> */}

      <View style={styles.row}>
        {actions.map((action) => (
          <ActionTile key={action.key} action={action} />
        ))}
      </View>
    </Card>
  );
}

function ActionTile({ action }: { action: QuickAction }) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={action.label}
      onPress={action.onPress}
      // A function style so the whole tile — disc and label together — dims on
      // press. The disc alone would leave the label looking detached from the
      // thing being tapped.
      style={({ pressed }) => [styles.tile, pressed && styles.tilePressed]}
    >
      <View style={[styles.disc, { backgroundColor: colors.primarySoft }]}>
        <Icon icon={action.icon} size={22} color="primary" />
      </View>

      <Text
        variant="caption"
        color="textSecondary"
        align="center"
        numberOfLines={2}
      >
        {action.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: Spacing.md,
    letterSpacing: 0.4,
  },
  row: {
    flexDirection: "row",
    gap: Spacing.sm,
    /**
     * Left at the default `stretch`. Tiles are as tall as the longest label —
     * Bangla runs to two lines where English fits one — and stretching holds
     * every disc on the same top edge instead of centring each tile against its
     * own height, which would leave the discs at three different levels.
     */
  },
  tile: {
    // Equal shares of the card's width, so the row fits 2, 3 or 4 tiles without
    // any of them carrying a hardcoded width.
    flex: 1,
    alignItems: "center",
    gap: Spacing.sm,
  },
  tilePressed: {
    opacity: 0.6,
  },
  disc: {
    width: 48,
    height: 48,
    borderRadius: Radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
});
