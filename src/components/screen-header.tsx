import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { NotificationBell } from "@/components/notification-bell";
import { Text } from "@/components/ui/text";
import { Spacing } from "@/theme";

export function ScreenHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  /** Extra control placed left of the bell. */
  action?: ReactNode;
}) {
  return (
    <View style={styles.header}>
      <View style={styles.titles}>
        <Text variant="title2" numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text variant="footnote" color="textTertiary" numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      {action}
      <NotificationBell />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  titles: {
    flex: 1,
    gap: 2,
  },
});
