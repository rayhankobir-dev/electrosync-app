import { useIsFocused, useRouter } from "expo-router";
import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { BackButton, BackButtonSize } from "@/components/back-button";
import { NotificationBell } from "@/components/notification-bell";
import { Text } from "@/components/ui/text";
import { Spacing, TypeScale } from "@/theme";

/**
 * Read from the token rather than copied, so changing the type scale moves the
 * button with the title instead of silently misaligning it.
 */
const TitleLineHeight = TypeScale.title2.lineHeight;

export function ScreenHeader({
  title,
  subtitle,
  action,
  root = false,
  bell = true,
}: {
  title: string;
  subtitle?: string;
  /** Extra control placed left of the bell. */
  action?: ReactNode;
  /**
   * Marks a screen as the bottom of the app — nothing sits above it, so it never
   * offers a way back however the history reads.
   *
   * Home needs this, and the router cannot work it out on its own. Tabs share one
   * history, so reaching Home a second time through the tab bar leaves
   * `Home → Meters → Home` behind it and `canGoBack()` answers true; the arrow
   * would then offer to return to Meters, which is sideways travel wearing the
   * costume of going back.
   */
  root?: boolean;
  /** Off for screens where the bell would point at the page you are on. */
  bell?: boolean;
}) {
  const router = useRouter();

  /**
   * Called for its subscription, not its value.
   *
   * `canGoBack()` is a method call rather than reactive state, so a screen that
   * renders once and then stays mounted — which is every tab root — would keep
   * whatever answer was true at mount and never grow an arrow. Subscribing to
   * focus re-runs this render whenever the screen is brought forward, which is
   * exactly when the arrow has to be right.
   */
  useIsFocused();

  /**
   * Two conditions, and both are about not showing an arrow that lies. `root`
   * covers the screen that has no parent to return to; `canGoBack` covers the
   * empty history — a cold start, or a deep link straight to a sub-page — where
   * `back()` would be a no-op. The tab bar is the way out in either case, and it
   * is always on screen here.
   */
  const showBack = !root && router.canGoBack();

  return (
    <View style={styles.header}>
      {showBack ? (
        <BackButton onPress={() => router.back()} style={styles.back} />
      ) : null}

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
      {bell ? <NotificationBell /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  back: {
    /**
     * Placement only — the circle's own shape lives in `BackButton`.
     *
     * Centres it on the title's first line rather than on the header as a whole.
     * The row aligns its children to the top, so this closes the gap between the
     * circle's own half-height and the title's — without it the button rides low
     * against a one-line title, and on `wallet`, whose header carries a subtitle
     * underneath, aligning to the row's centre instead would drop it a full 10
     * points.
     */
    marginTop: (TitleLineHeight - BackButtonSize) / 2,
  },
  titles: {
    flex: 1,
    gap: 2,
  },
});
