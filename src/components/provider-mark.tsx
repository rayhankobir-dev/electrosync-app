import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

import type { MeterProvider } from "@/api/types";
import { Radius, Spacing, useTheme } from "@/theme";
import { utilityFor } from "@/utility";

export function ProviderMark({
  provider,
  size = 56,
}: {
  provider: MeterProvider;
  size?: number;
}) {
  const { colors } = useTheme();
  const utility = utilityFor(provider);

  return (
    <View
      style={[
        styles.frame,
        {
          width: size,
          height: size,
          borderRadius: size < 64 ? Radius.md : Radius.lg,
          paddingHorizontal: 6,
          borderColor: colors.border,
        },
      ]}
    >
      <Image
        source={utility.logo}
        style={styles.image}
        contentFit="contain"
        transition={160}
        // Decorative: the meter's label and the provider's name in text already
        // carry the meaning, so announcing the image would just be noise.
        accessible={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    // The marks are drawn to the edge of their square canvas, so without an
    // inset they touch the tile's rounded corners.
    padding: Spacing.xs,
  },
  image: {
    width: "100%",
    height: "100%",
  },
});
