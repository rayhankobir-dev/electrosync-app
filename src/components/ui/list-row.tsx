import { ArrowRight01Icon } from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@hugeicons/react-native";
import { Children, Fragment, isValidElement, type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { Card, CardPadding } from "@/components/ui/card";
import { Spacing, useTheme } from "@/theme";

import { Icon } from "./icon";
import { Text } from "./text";

export function ListRow({
  icon,
  label,
  detail,
  trailing,
  chevron = false,
  tone = "default",
  disabled = false,
  onPress,
}: {
  icon?: IconSvgElement;
  label: string;
  detail?: string;
  trailing?: ReactNode;
  chevron?: boolean;
  tone?: "default" | "danger";
  disabled?: boolean;
  onPress?(): void;
}) {
  const { colors } = useTheme();
  const tint = tone === "danger" ? "danger" : "textSecondary";

  const content = (
    <>
      {icon ? <Icon icon={icon} size={20} color={tint} /> : null}

      <View style={styles.labels}>
        <Text
          variant="body"
          color={tone === "danger" ? "danger" : "text"}
          numberOfLines={1}
        >
          {label}
        </Text>
        {detail ? (
          <Text variant="footnote" color="textTertiary" numberOfLines={2}>
            {detail}
          </Text>
        ) : null}
      </View>

      {trailing}
      {chevron ? (
        <Icon icon={ArrowRight01Icon} size={18} color="textTertiary" />
      ) : null}
    </>
  );

  if (!onPress || disabled) {
    return (
      <View style={[styles.row, disabled ? styles.disabled : null]}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      // The group's card clips to its radius, so the press fill reaches the
      // corners of the first and last rows without rounding them itself.
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: pressed ? colors.surfacePressed : "transparent" },
      ]}
    >
      {content}
    </Pressable>
  );
}

/** Rows in a card, hairline-separated. */
export function ListGroup({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const rows = Children.toArray(children);

  return (
    <Card padded={false}>
      {rows.map((row, index) => (
        // `Children.toArray` has already assigned every child a stable key.
        <Fragment key={isValidElement(row) ? row.key : index}>
          {index > 0 ? (
            /**
             * A `borderBottomWidth`, not a filled View of `hairlineWidth`
             * height. RN snaps border widths to the pixel grid; a sub-pixel
             * filled box antialiases into a smear or rounds away entirely.
             */
            <View
              style={[styles.divider, { borderBottomColor: colors.border }]}
            />
          ) : null}
          {row}
        </Fragment>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingHorizontal: CardPadding,
    paddingVertical: Spacing.md,
    minHeight: 56,
  },
  disabled: {
    opacity: 0.4,
  },
  labels: {
    flex: 1,
    gap: 2,
  },
  divider: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
});
