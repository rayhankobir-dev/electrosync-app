import { Text as RNText, type TextProps as RNTextProps } from "react-native";

import { useI18n } from "@/i18n";
import {
  fontFamily,
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
   * Asks for tabular (equal-advance) digits. Use for balances, meter numbers,
   * dates — anything read as a column. Honoured in English; inert in Bangla,
   * where Hind Siliguri ships no `tnum`.
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
  ...rest
}: TextProps) {
  const { colors } = useTheme();
  const { locale } = useI18n();
  const scale = TypeScale[variant];

  return (
    <RNText
      style={[
        {
          color: colors[color],
          fontSize: scale.size,
          lineHeight: resolveLineHeight(variant, locale),
          fontFamily: fontFamily(locale, scale.weight),
          textAlign: align,
        },
        numeric && TabularNumbers,
        style,
      ]}
      {...rest}
    />
  );
}
