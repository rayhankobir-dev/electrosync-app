import type { IconSvgElement } from "@hugeicons/react-native";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useI18n } from "@/i18n";
import { ALERT_KINDS, ALERT_STYLES, type AlertKind } from "@/notifications/kinds";
import { Radius, Spacing, useTheme, withAlpha, type ColorName } from "@/theme";

/** `null` means every kind — the chip row's default. */
export type KindFilter = AlertKind | null;

export type NotificationFilter = {
  unreadOnly: boolean;
  kind: KindFilter;
};

export const NoFilter: NotificationFilter = { unreadOnly: false, kind: null };

export function isFiltering(filter: NotificationFilter): boolean {
  return filter.unreadOnly || filter.kind !== null;
}

/**
 * A single scrolling row: an unread toggle, then one chip per alert kind.
 *
 * The two behave differently on purpose. Unread is a *toggle* — it narrows
 * whatever kind is selected, because "unread low-balance alerts" is a question
 * people actually ask. The kinds are *exclusive*, because "low balance or
 * recharged, but not depleted" is not.
 *
 * Horizontally scrollable rather than wrapped to two lines: the row sits under
 * a screen title and above a list, and a filter bar that changes height as the
 * locale changes would shift the list under the user's thumb.
 */
export function NotificationFilters({
  filter,
  unreadCount,
  onChange,
}: {
  filter: NotificationFilter;
  /** Shown on the unread chip. Omitted from the label when zero. */
  unreadCount: number;
  onChange(next: NotificationFilter): void;
}) {
  const { t, formatNumber } = useI18n();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      // Without this the row grows to the full height of its parent and the
      // chips float in the middle of the gap.
      style={styles.scroller}
    >
      <Chip
        label={
          unreadCount > 0
            ? `${t("notifications.filterUnread")} · ${formatNumber(unreadCount)}`
            : t("notifications.filterUnread")
        }
        tone="primary"
        selected={filter.unreadOnly}
        onPress={() => onChange({ ...filter, unreadOnly: !filter.unreadOnly })}
      />

      {/* Marks where the independent toggle ends and the exclusive set begins.
          Without it the unread chip reads as a fourth mutually exclusive
          option, and its staying lit while a kind is picked looks like a bug. */}
      <Divider />

      <Chip
        label={t("notifications.filterAll")}
        tone="primary"
        selected={filter.kind === null}
        onPress={() => onChange({ ...filter, kind: null })}
      />

      {ALERT_KINDS.map((kind) => {
        const style = ALERT_STYLES[kind];

        return (
          <Chip
            key={kind}
            label={t(style.labelKey)}
            icon={style.icon}
            // Each kind wears its own tone, the same one its rows carry in the
            // list — so the chip and the cards it filters to are visibly the
            // same colour rather than all going generic blue.
            tone={style.tone}
            selected={filter.kind === kind}
            onPress={() =>
              onChange({ ...filter, kind: filter.kind === kind ? null : kind })
            }
          />
        );
      })}
    </ScrollView>
  );
}

function Chip({
  label,
  icon,
  tone,
  selected,
  onPress,
}: {
  label: string;
  icon?: IconSvgElement;
  tone: ColorName;
  selected: boolean;
  onPress(): void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          // Selected fills with the tone's soft companion and outlines in the
          // tone itself. Unselected keeps the neutral card treatment, so the
          // row reads as "one of these is on" at a glance.
          backgroundColor: selected
            ? withAlpha(colors[tone], 0.14)
            : colors.surface,
          borderColor: selected ? colors[tone] : colors.border,
        },
        pressed && styles.chipPressed,
      ]}
    >
      {icon ? (
        <Icon
          icon={icon}
          size={15}
          color={selected ? tone : "textTertiary"}
          strokeWidth={2}
        />
      ) : null}

      <Text
        variant="captionStrong"
        color={selected ? tone : "textSecondary"}
        numberOfLines={1}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Divider() {
  const { colors } = useTheme();
  return <View style={[styles.divider, { backgroundColor: colors.border }]} />;
}

const styles = StyleSheet.create({
  scroller: {
    flexGrow: 0,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    // The row runs edge to edge, so the last chip needs a little run-off before
    // the screen's own gutter to look scrollable rather than cut.
    paddingRight: Spacing.xs,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    height: 34,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  chipPressed: {
    opacity: 0.65,
  },
  divider: {
    width: 1,
    height: 18,
    marginHorizontal: Spacing.xs / 2,
  },
});
