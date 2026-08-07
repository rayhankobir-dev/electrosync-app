import {
  ArrowLeft01Icon,
  BatteryCharging01Icon,
  BatteryEmptyIcon,
  BatteryLowIcon,
  Notification03Icon,
} from '@hugeicons/core-free-icons';
import { useRouter } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { isApiError } from '@/api/errors';
import type { Notification } from '@/api/types';
import { Banner } from '@/components/ui/banner';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Screen } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { useMarkNotificationRead, useNotifications } from '@/hooks/use-notifications';
import { useI18n } from '@/i18n';
import { isoToEpochSeconds, relativeTime } from '@/lib/relative-time';
import { HitSlop, Radius, Spacing, useTheme, withAlpha, type ColorName } from '@/theme';

/**
 * Per-kind accent for the rows the balance sweep produces. The kind rides in
 * the notification's untyped `data` bag (see the backend's `push()`), so it is
 * narrowed at runtime rather than typed on `Notification`.
 *
 * `tone` names a theme colour that also has a `${tone}Soft` companion — the
 * pair is what lets the card tint and the icon badge stay in step across
 * light and dark.
 */
const ALERT_STYLES = {
  LOW_BALANCE: { icon: BatteryLowIcon, tone: 'warning' },
  BALANCE_DEPLETED: { icon: BatteryEmptyIcon, tone: 'danger' },
  RECHARGE_DETECTED: { icon: BatteryCharging01Icon, tone: 'success' },
} as const;

type AlertKind = keyof typeof ALERT_STYLES;

function alertKind(data: Notification['data']): AlertKind | null {
  const kind = data?.kind;
  return typeof kind === 'string' && kind in ALERT_STYLES ? (kind as AlertKind) : null;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const { data, isPending, isError, error, refetch, isRefetching } = useNotifications();
  const markRead = useMarkNotificationRead();

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
      </View>

      {isPending ? (
        <ActivityIndicator style={styles.centered} />
      ) : isError ? (
        <Banner message={t(isApiError(error) ? error.messageKey : 'errors.unknown')} />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onRefresh={() => void refetch()}
          refreshing={isRefetching}
          ListEmptyComponent={<EmptyState />}
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

const styles = StyleSheet.create({
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  topTitle: {
    flex: 1,
  },
  list: {
    gap: Spacing.md,
    paddingBottom: Spacing['2xl'],
  },
  centered: {
    marginTop: Spacing['2xl'],
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
