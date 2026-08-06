import { BellDotIcon } from "@hugeicons/core-free-icons";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { useUnreadCount } from "@/hooks/use-notifications";
import { useI18n } from "@/i18n";
import { HitSlop, Radius, Spacing, useTheme } from "@/theme";

const MAX_DISPLAY = 99;

export function NotificationBell() {
  const router = useRouter();
  const { colors } = useTheme();
  const { t, formatNumber } = useI18n();
  const unread = useUnreadCount();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        unread > 0
          ? `${t("notifications.open")}, ${t("notifications.unreadBadge", { count: unread })}`
          : t("notifications.open")
      }
      hitSlop={HitSlop / 4}
      onPress={() => router.push("/notifications")}
      style={styles.root}
    >
      <Icon icon={BellDotIcon} size={24} color="text" />

      {unread > 0 ? (
        <View
          style={[
            styles.badge,
            {
              backgroundColor: colors.danger,
              // Ringed in the surface colour so the badge stays legible when it
              // overlaps the bell's own strokes.
              borderColor: colors.background,
            },
          ]}
        >
          <Text variant="micro" color="textInverse" numberOfLines={1}>
            {unread > MAX_DISPLAY
              ? `${formatNumber(MAX_DISPLAY)}+`
              : formatNumber(unread)}
          </Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    overflow: "visible",
  },
  badge: {
    position: "absolute",
    top: -6,
    right: -8,
    minWidth: 18,
    height: 18,
    borderRadius: Radius.full,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xs - 1,
  },
});
