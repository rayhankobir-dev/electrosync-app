import type { ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { MaxContentWidth, Spacing, useTheme } from '@/theme';

export type ScreenProps = {
  children: ReactNode;
  /**
   * Pinned above the scroll area instead of scrolling with it, and given the
   * top safe-area inset the content would otherwise carry.
   *
   * Only meaningful alongside `scrollable`: without a scroll container the
   * children already sit still, and a header passed as a child is identical.
   * Screens that own their list (`FlatList`) get the same effect for free by
   * putting the header above it in `children`.
   */
  header?: ReactNode;
  /** Wraps content in a ScrollView. Off for screens that manage their own list. */
  scrollable?: boolean;
  /** Adds bottom safe-area padding. Turn off when a tab bar already covers it. */
  edgeToEdgeBottom?: boolean;
  /**
   * The gutter under the content. Turn it off when the screen hosts its own
   * scroll container: this padding lands on the wrapper *outside* that
   * container, so it shortens the scrollable viewport and leaves a strip of
   * dead background at the end of the scroll. Such screens should put their
   * bottom breathing room in their own `contentContainerStyle` instead, where it
   * scrolls with the content.
   */
  bottomGutter?: boolean;
  contentStyle?: ViewStyle;
};

export function Screen({
  children,
  header,
  scrollable = false,
  edgeToEdgeBottom = true,
  bottomGutter = true,
  contentStyle,
}: ScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const padding: ViewStyle = {
    // Handed to the header when there is one, so the status bar clears the
    // title rather than the first row of content that happens to scroll under it.
    paddingTop: header ? 0 : insets.top + Spacing.sm,
    paddingBottom:
      (edgeToEdgeBottom ? insets.bottom : 0) + (bottomGutter ? Spacing.xl : 0),
    paddingHorizontal: Spacing.lg,
  };

  const inner = (
    // Centred with a max width so tablets and the web build do not stretch a
    // form across 1200px.
    <View style={[styles.centered, contentStyle]}>{children}</View>
  );

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: colors.background }]}
      // Only iOS needs this; on Android the window resizes on its own and
      // 'padding' fights the resize, producing a jumping layout.
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {header ? (
        <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
          <View style={styles.headerInner}>{header}</View>
        </View>
      ) : null}

      {scrollable ? (
        <ScrollView
          contentContainerStyle={[styles.scrollContent, padding]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {inner}
        </ScrollView>
      ) : (
        <View style={[styles.flex, padding]}>{inner}</View>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  centered: {
    flex: 1,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
  header: {
    paddingHorizontal: Spacing.lg,
  },
  headerInner: {
    // `centered` without its `flex: 1` — the header is sized by its content, and
    // stretching it would push the scroll area off the bottom of the screen.
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
});
