import { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import { Text } from "@/components/ui/text";
import { LOCALES, useI18n, type Locale } from "@/i18n";
import { Radius, useTheme } from "@/theme";

const LABELS: Record<Locale, string> = { en: "EN", bn: "বাং" };

const OPTION_SIZE = 30;
const TRACK_PADDING = 2;
const GAP = 4;
const TRACK_BORDER = 1.5;
const SLIDE_SPRING = { damping: 18, stiffness: 240, mass: 0.5 } as const;

export function LanguageToggle() {
  const { colors } = useTheme();
  const { locale, setLocale } = useI18n();

  const index = Math.max(0, LOCALES.indexOf(locale));
  const offset = useSharedValue(index * (OPTION_SIZE + GAP));

  useEffect(() => {
    offset.value = withSpring(index * (OPTION_SIZE + GAP), SLIDE_SPRING);
  }, [index, offset]);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offset.value }],
  }));

  return (
    <View
      accessibilityRole="radiogroup"
      style={[styles.track, { borderColor: colors.borderStrong }]}
    >
      <Animated.View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[styles.thumb, { backgroundColor: colors.primary }, thumbStyle]}
      />

      {LOCALES.map((option) => {
        const selected = option === locale;

        return (
          <Pressable
            key={option}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => setLocale(option)}
            style={({ pressed }) => [
              styles.option,
              pressed && !selected
                ? { backgroundColor: colors.surfacePressed }
                : null,
            ]}
          >
            <Text
              variant="captionStrong"
              color={selected ? "onPrimary" : "textSecondary"}
              align="center"
            >
              {LABELS[option]}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: "row",
    // No `alignSelf` — every parent already places this (the sign-in top bar
    // right-aligns it, `ListRow` centres it) and a value here would win over them.
    borderRadius: Radius.full,
    borderWidth: TRACK_BORDER,
    padding: TRACK_PADDING,
    gap: GAP,
  },
  thumb: {
    // Offsets are from the padding edge, so these sit inside the border without
    // having to account for `TRACK_BORDER`.
    position: "absolute",
    top: TRACK_PADDING,
    left: TRACK_PADDING,
    width: OPTION_SIZE,
    height: OPTION_SIZE,
    borderRadius: Radius.full,
  },
  option: {
    width: OPTION_SIZE,
    height: OPTION_SIZE,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: Radius.full,
  },
});
