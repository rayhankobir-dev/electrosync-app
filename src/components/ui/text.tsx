import { Children, type ReactNode } from "react";
import { Text as RNText, type TextProps as RNTextProps } from "react-native";

import { useI18n } from "@/i18n";
import {
  fontFamily,
  numericFontFamily,
  TabularNumbers,
  resolveLineHeight,
  TypeScale,
  useTheme,
  type ColorName,
  type TypeVariant,
} from "@/theme";

export type TextProps = RNTextProps & {
  variant?: TypeVariant;
  color?: ColorName;
  /**
   * Marks digits read as data — balances, meter numbers, dates, anything read as
   * a column.
   *
   * In Bangla this switches the family to Li Ador Noirrit, whose numerals match
   * the printed convention on local bills and meters, and rewrites the digits
   * themselves as Bangla numerals. In English it only asks for tabular
   * (equal-advance) digits, which stays inert — Hind Siliguri ships no `tnum` in
   * either script.
   *
   * The rewrite lives here rather than at each call site because it is the same
   * decision as the family switch: text flagged as data reads in the reader's
   * numeral system, whether it came from `formatCurrency` or straight off the
   * portal as a meter number. Values the user has to reproduce elsewhere — the
   * customer number the copy button puts on the clipboard — are read from the
   * source string, not from what is on screen, so they stay in ASCII.
   */
  numeric?: boolean;
  align?: "auto" | "left" | "right" | "center";
};

export function Text({
  variant = "body",
  color = "text",
  numeric = false,
  align,
  style,
  children,
  ...rest
}: TextProps) {
  const { colors } = useTheme();
  const { locale, localizeDigits } = useI18n();
  const scale = TypeScale[variant];

  return (
    <RNText
      style={[
        {
          color: colors[color],
          fontSize: scale.size,
          lineHeight: resolveLineHeight(variant, locale),
          fontFamily: numeric
            ? numericFontFamily(scale.weight, locale)
            : fontFamily(scale.weight),
          textAlign: align,
        },
        numeric && TabularNumbers,
        style,
      ]}
      {...rest}
    >
      {numeric ? localizeLeaves(children, localizeDigits) : children}
    </RNText>
  );
}

/**
 * Applies `localize` to the string and number leaves of `children`, passing
 * elements through untouched.
 *
 * Nested elements are left to localise themselves: a `<Text numeric>` inside a
 * `<Text numeric>` does its own leaves, and one without the flag was marked as
 * not-data on purpose.
 */
function localizeLeaves(
  children: ReactNode,
  localize: (text: string) => string,
): ReactNode {
  if (typeof children === "string") return localize(children);
  if (typeof children === "number") return localize(String(children));
  if (Array.isArray(children)) {
    return Children.map(children, (child) => localizeLeaves(child, localize));
  }
  return children;
}
