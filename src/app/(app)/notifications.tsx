import { ArrowLeft01Icon, Notification03Icon } from '@hugeicons/core-free-icons';
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
import { HitSlop, Radius, Spacing, useTheme } from '@/theme';

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

  return (
    <Pressable onPress={onPress} disabled={!unread}>
      <Card
        style={{
          // Unread carries a tint as well as the dot: the dot alone is easy to
          // miss when scanning a long list.
          backgroundColor: unread ? colors.primarySoft : colors.surface,
          borderColor: unread ? colors.primary : colors.border,
        }}
      >
        <View style={styles.row}>
          {unread ? <View style={[styles.dot, { backgroundColor: colors.primary }]} /> : null}

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
