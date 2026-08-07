import {
  ArrowLeft01Icon,
  CheckmarkCircle02Icon,
  Delete02Icon,
  Notification03Icon,
} from '@hugeicons/core-free-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';

import { isApiError } from '@/api/errors';
import type { Notification } from '@/api/types';
import {
  NoFilter,
  NotificationFilters,
  isFiltering,
  type NotificationFilter,
} from '@/components/notification-filters';
import { Banner } from '@/components/ui/banner';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import {
  SkeletonBlock,
  SkeletonGroup,
  SkeletonLine,
} from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { useToast } from '@/components/ui/toast-host';
import {
  unreadCount as countUnread,
  useClearNotifications,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
} from '@/hooks/use-notifications';
import { useI18n } from '@/i18n';
import { isoToEpochSeconds, relativeTime } from '@/lib/relative-time';
import { ALERT_STYLES, alertKind } from '@/notifications/kinds';
import { HitSlop, Radius, Spacing, useTheme, withAlpha, type ColorName } from '@/theme';

export default function NotificationsScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const toast = useToast();
  const { data, isPending, isError, error, refetch, isRefetching } = useNotifications();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const clearAll = useClearNotifications();

  const [filter, setFilter] = useState<NotificationFilter>(NoFilter);

  const unread = countUnread(data);

  /**
   * Filtering happens here rather than in the query so the two controls stay
   * instant: switching a chip re-derives a list that is already in memory
   * instead of round-tripping to a portal scrape.
   */
  const visible = useMemo(() => {
    if (!data) return [];

    return data.filter((item) => {
      if (filter.unreadOnly && item.readAt !== null) return false;
      if (filter.kind !== null && alertKind(item.data) !== filter.kind) return false;
      return true;
    });
  }, [data, filter]);

  function onMarkAllRead() {
    markAllRead.mutate(undefined, {
      onError: (mutationError: unknown) => {
        toast.error(
          t('notifications.markAllReadFailed'),
          t(isApiError(mutationError) ? mutationError.messageKey : 'errors.unknown'),
        );
      },
    });
  }

  function onClearAll() {
    const clear = () =>
      clearAll.mutate(undefined, {
        onError: (mutationError: unknown) => {
          toast.error(
            t('notifications.clearAllFailed'),
            t(isApiError(mutationError) ? mutationError.messageKey : 'errors.unknown'),
          );
        },
      });

    // Alert is unimplemented on React Native Web — same shape as the meter
    // removal confirm.
    if (Platform.OS === 'web') {
      clear();
      return;
    }

    Alert.alert(t('notifications.clearAllConfirm'), t('notifications.clearAllBody'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('notifications.clearAll'), style: 'destructive', onPress: clear },
    ]);
  }

  // Both actions act on the whole list, so they are disabled by the state of
  // the whole list rather than by what the filter happens to be showing —
  // "mark all read" with an empty unread-only view would otherwise look like it
  // had nothing to do while twenty read rows sat behind the filter.
  const canMarkAllRead = unread > 0 && !markAllRead.isPending;
  const canClearAll = (data?.length ?? 0) > 0 && !clearAll.isPending;

  return (
    <Screen edgeToEdgeBottom={false}>
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
          hitSlop={HitSlop / 4}
          onPress={() => router.back()}
        >
          <Icon icon={ArrowLeft01Icon} color="textSecondary" />
        </Pressable>
        <Text variant="title2" style={styles.topTitle} numberOfLines={1}>
          {t('notifications.title')}
        </Text>

        <TopAction
          icon={CheckmarkCircle02Icon}
          label={t('notifications.markAllRead')}
          tone="primary"
          disabled={!canMarkAllRead}
          onPress={onMarkAllRead}
        />
        <TopAction
          icon={Delete02Icon}
          label={t('notifications.clearAll')}
          tone="danger"
          disabled={!canClearAll}
          onPress={onClearAll}
        />
      </View>

      {/* Kept out of the error and loading branches: a filter row that appears
          only once the list has loaded makes the header jump on every open. */}
      <View style={styles.filters}>
        <NotificationFilters filter={filter} unreadCount={unread} onChange={setFilter} />
      </View>

      {isPending ? (
        <NotificationsSkeleton />
      ) : isError ? (
        <Banner message={t(isApiError(error) ? error.messageKey : 'errors.unknown')} />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onRefresh={() => void refetch()}
          refreshing={isRefetching}
          /**
           * Two different empty states. "Nothing has ever arrived" and "your
           * filter excluded everything" need different words — the first is
           * reassurance, the second is an instruction to widen the filter — and
           * showing the welcome copy to someone who just tapped a chip reads as
           * though the tap deleted their notifications.
           */
          ListEmptyComponent={
            isFiltering(filter) ? <NoMatches onClear={() => setFilter(NoFilter)} /> : <EmptyState />
          }
          renderItem={({ item }) => (
            <NotificationRow
              notification={item}
              onPress={() => {
                // Idempotent server-side, but skipping the call for an already
                // read row avoids a pointless request on every tap.
                if (item.readAt === null) markRead.mutate(item.id);
              }}
            />
          )}
        />
      )}
    </Screen>
  );
}

/**
 * The list before it arrives.
 *
 * Four rows rather than the three the other screens use: notifications are the
 * one list here that is normally long, so a short stack of placeholders would
 * be followed by a visible jump as the real list pushed past it.
 *
 * Every row is drawn on a plain `Card`. The real rows are tinted by alert kind
 * and by read state, and a placeholder cannot know either — filling them with a
 * colour would be a claim about content that has not loaded, and getting it
 * wrong would flash the wrong severity at the user.
 */
function NotificationsSkeleton() {
  return (
    <View style={styles.list}>
      {[0, 1, 2, 3].map((index) => (
        <Card key={index}>
          <SkeletonGroup>
            <View style={styles.row}>
              <SkeletonBlock width={38} height={38} radius={Radius.full} />

              {/* Looser than `rowMain`'s 2px: a glyph box carries leading, a
                  solid bar does not, so the same gap between bars would read as
                  one thick block rather than three lines. */}
              <View style={styles.skeletonLines}>
                <SkeletonLine width="72%" height={16} />
                <SkeletonLine width="92%" height={12} />
                <SkeletonLine width={64} height={10} />
              </View>

              {/*
                No unread dot. It is the one mark on the row that carries state
                rather than shape, and a placeholder standing in for it would
                promise unread notifications that may not exist.
              */}
            </View>
          </SkeletonGroup>
        </Card>
      ))}
    </View>
  );
}

function TopAction({
  icon,
  label,
  tone,
  disabled,
  onPress,
}: {
  icon: Parameters<typeof Icon>[0]['icon'];
  label: string;
  tone: ColorName;
  disabled: boolean;
  onPress(): void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      hitSlop={HitSlop / 4}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => pressed && styles.actionPressed}
    >
      {/* Greyed rather than hidden. These sit beside the title, and a control
          that vanishes when the list empties makes the header reflow every
          time the last notification is read. */}
      <Icon icon={icon} size={22} color={disabled ? 'textTertiary' : tone} />
    </Pressable>
  );
}

function NotificationRow({
  notification,
  onPress,
}: {
  notification: Notification;
  onPress(): void;
}) {
  const { colors } = useTheme();
  const { t, formatNumber, formatDate } = useI18n();

  const unread = notification.readAt === null;
  const sentAt = isoToEpochSeconds(notification.sentAt);
  const relative = relativeTime(sentAt);

  const timeLabel =
    'absolute' in relative
      ? formatDate(sentAt)
      : t(relative.key, { count: formatNumber(relative.count) });

  const kind = alertKind(notification.data);
  const alert = kind ? ALERT_STYLES[kind] : null;

  // The kind sets the card's colour; read state only sets how loud it is. A
  // low-balance row that has been opened is still a low-balance row, so the
  // tint stays and the border drops back to the neutral one.
  const accent: ColorName = alert ? alert.tone : 'primary';
  const accentSoft = `${accent}Soft` as ColorName;

  return (
    <Pressable onPress={onPress} disabled={!unread}>
      <Card
        style={{
          // Unread carries a tint as well as the dot: the dot alone is easy to
          // miss when scanning a long list.
          backgroundColor: alert || unread ? colors[accentSoft] : colors.surface,
          borderColor: unread ? colors[accent] : colors.border,
        }}
      >
        <View style={styles.row}>
          <View
            style={[
              styles.badge,
              {
                // A translucent accent rather than a solid one: the badge sits
                // on the card's own soft tint, and stacking the two shades of
                // the same hue reads as one object instead of a sticker.
                backgroundColor: alert ? withAlpha(colors[accent], 0.16) : colors.surfacePressed,
              },
            ]}
          >
            <Icon
              icon={alert ? alert.icon : Notification03Icon}
              size={20}
              color={alert ? accent : 'textTertiary'}
            />
          </View>

          <View style={styles.rowMain}>
            <Text variant="bodyMedium" numberOfLines={2}>
              {notification.title}
            </Text>
            <Text variant="footnote" color="textSecondary">
              {notification.body}
            </Text>
            <Text variant="caption" color="textTertiary" style={styles.time}>
              {timeLabel}
            </Text>
          </View>

          {unread ? <View style={[styles.dot, { backgroundColor: colors[accent] }]} /> : null}
        </View>
      </Card>
    </Pressable>
  );
}

function EmptyState() {
  const { t } = useI18n();
  const { colors } = useTheme();

  return (
    <Card>
      <View style={styles.empty}>
        <View style={[styles.emptyIcon, { backgroundColor: colors.surfacePressed }]}>
          <Icon icon={Notification03Icon} size={28} color="textTertiary" />
        </View>
        <Text variant="title3" align="center">
          {t('notifications.emptyTitle')}
        </Text>
        <Text variant="callout" color="textSecondary" align="center">
          {t('notifications.emptyBody')}
        </Text>
      </View>
    </Card>
  );
}

/**
 * The filtered-to-nothing state. Carries the way out of it, because the filter
 * row scrolls horizontally and the chip responsible may well be off-screen by
 * the time the user reads this.
 */
function NoMatches({ onClear }: { onClear(): void }) {
  const { t } = useI18n();
  const { colors } = useTheme();

  return (
    <Card>
      <View style={styles.empty}>
        <View style={[styles.emptyIcon, { backgroundColor: colors.surfacePressed }]}>
          <Icon icon={Notification03Icon} size={28} color="textTertiary" />
        </View>
        <Text variant="title3" align="center">
          {t('notifications.noMatchesTitle')}
        </Text>
        <Text variant="callout" color="textSecondary" align="center">
          {t('notifications.noMatchesBody')}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={onClear}
          hitSlop={HitSlop / 4}
          style={({ pressed }) => pressed && styles.actionPressed}
        >
          <Text variant="subhead" color="primary" style={styles.clearFilter}>
            {t('notifications.clearFilter')}
          </Text>
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  filters: {
    marginBottom: Spacing.lg,
    /**
     * Cancels the screen's horizontal gutter so the chip row can scroll from
     * edge to edge, then hands the gutter back as content inset — otherwise the
     * first chip is padded but the last one is clipped mid-chip at the screen's
     * edge, which reads as a rendering fault rather than as more content.
     */
    marginHorizontal: -Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  actionPressed: {
    opacity: 0.55,
  },
  clearFilter: {
    marginTop: Spacing.xs,
  },
  topTitle: {
    flex: 1,
  },
  list: {
    gap: Spacing.md,
    paddingBottom: Spacing['2xl'],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.md,
  },
  rowMain: {
    flex: 1,
    gap: 2,
  },
  skeletonLines: {
    flex: 1,
    gap: Spacing.sm,
  },
  badge: {
    width: 38,
    height: 38,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: Radius.full,
    // Nudged down to sit on the title's optical centre rather than its box top.
    marginTop: 7,
  },
  time: {
    marginTop: Spacing.xs,
  },
  empty: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.lg,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
});
