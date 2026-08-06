import { HugeiconsIcon } from '@hugeicons/react-native';
import type { ComponentProps } from 'react';

import { useTheme, type ColorName } from '@/theme';

type HugeiconsProps = ComponentProps<typeof HugeiconsIcon>;

export type IconProps = Omit<HugeiconsProps, 'color'> & {
  /** A theme colour name rather than a literal, so icons follow the scheme. */
  color?: ColorName;
};

export function Icon({ color = 'text', size = 22, strokeWidth = 1.8, ...rest }: IconProps) {
  const { colors } = useTheme();

  return <HugeiconsIcon color={colors[color]} size={size} strokeWidth={strokeWidth} {...rest} />;
}
