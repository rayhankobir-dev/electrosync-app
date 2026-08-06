import { FlashIcon } from '@hugeicons/core-free-icons';
import { StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { Radius, useTheme } from '@/theme';

export function BrandMark({ size = 52 }: { size?: number }) {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.mark,
        {
          width: size,
          height: size,
          borderRadius: Radius.lg,
          backgroundColor: colors.primarySoft,
        },
      ]}>
      <Icon icon={FlashIcon} size={size * 0.52} color="primary" strokeWidth={2} />
    </View>
  );
}

const styles = StyleSheet.create({
  mark: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
