import { FactoryIcon, Home01Icon, OfficeIcon } from '@hugeicons/core-free-icons';
import type { IconSvgElement } from '@hugeicons/react-native';
import { Image, type ImageSource } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import type { MeterType } from '@/api/types';
import type { TranslationKey } from '@/i18n';
import { Radius, useTheme } from '@/theme';

/**
 * The source art is 1024px with an opaque radial-gradient background baked in
 * (warm for home, cool for office) — it is not a transparent cutout. Clipping
 * it to a rounded tile turns that background into deliberate framing instead of
 * a stray dark square on a light card, and it reads correctly in both themes.
 *
 * These are downscaled 512px copies of `assets/images/vectors/*`; the originals
 * are ~1.6MB each, which is far more than a 64pt thumbnail needs.
 */
const ART: Record<MeterType, ImageSource> = {
  HOME: require('@/assets/images/meter/home.png') as ImageSource,
  OFFICE: require('@/assets/images/meter/office.png') as ImageSource,
  INDUSTRY: require('@/assets/images/meter/industry.png') as ImageSource,
};

/**
 * Label per type, alongside the art it belongs with. A `Record` rather than a
 * ternary at each call site: adding a meter type is then a type error until it
 * has both a picture and a name, instead of silently reading as "Office"
 * everywhere the ternary fell through.
 */
export const MeterTypeLabelKey: Record<MeterType, TranslationKey> = {
  HOME: 'meters.typeHome',
  OFFICE: 'meters.typeOffice',
  INDUSTRY: 'meters.typeIndustry',
};

/**
 * Line-art counterpart to `ART`, for the places a type has to be named in a
 * strip too small for the painted tile — the ribbon on a meter card. Kept in the
 * same `Record` shape and for the same reason: a new meter type is a type error
 * until it has a picture, a name, and a glyph.
 */
export const MeterTypeIcon: Record<MeterType, IconSvgElement> = {
  HOME: Home01Icon,
  OFFICE: OfficeIcon,
  INDUSTRY: FactoryIcon,
};

export function MeterArtwork({
  type,
  size = 56,
}: {
  type: MeterType;
  size?: number;
}) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.frame,
        {
          width: size,
          height: size,
          // Radius tracks size so a 56pt thumbnail and a 96pt hero keep the
          // same visual roundness rather than one looking like a circle.
          borderRadius: size < 64 ? Radius.md : Radius.lg,
          borderColor: colors.border,
        },
      ]}>
      <Image
        source={ART[type]}
        style={styles.image}
        contentFit="cover"
        transition={160}
        // Decorative: the meter's label and type badge already carry the
        // meaning, so announcing the image would just be noise.
        accessible={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  image: {
    width: '100%',
    height: '100%',
  },
});
