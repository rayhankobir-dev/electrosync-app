import {
  Activity03Icon,
  Calendar03Icon,
  Coins01Icon,
  DashboardSpeed01Icon,
  ElectricPlugsIcon,
  ElectricTower01Icon,
  IdentityCardIcon,
  Location01Icon,
  OfficeIcon,
  UserIcon,
  WaveIcon,
} from '@hugeicons/core-free-icons';
import type { IconSvgElement } from '@hugeicons/react-native';
import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { useI18n } from '@/i18n';
import { Spacing } from '@/theme';
import type { UtilityCustomerInfo } from '@/utility';

/**
 * The meter's static particulars, as the provider reports them.
 *
 * Shared by the home screen and the detail screen's info tab — the same five
 * facts in both places, so they live here rather than being kept in step by
 * hand. Presentational only: each caller decides what to show while the query
 * behind `info` is still pending or has failed.
 *
 * Takes no style override on purpose: the row spacing is the card's own, and a
 * caller passing a `gap` down would compound with each row's padding instead of
 * replacing it.
 */
export function MeterInfoCard({ info }: { info: UtilityCustomerInfo }) {
  const { t, formatCurrency, formatDate, formatNumber } = useI18n();

  return (
    <Card>
      {/* Ordered who → where → what: the account holder, the supply that reaches
          them, then the meter itself. Reading it top to bottom answers "whose
          meter is this?" before "what is it rated at?". */}
      <DetailRow
        icon={IdentityCardIcon}
        label={t('home.consumerNo')}
        value={info.consumerNo}
        numeric
      />
      <DetailRow icon={UserIcon} label={t('home.name')} value={info.name} />
      <DetailRow
        icon={Location01Icon}
        label={t('home.address')}
        value={info.address}
      />

      <DetailRow icon={OfficeIcon} label={t('home.office')} value={info.office} />
      <DetailRow
        icon={ElectricTower01Icon}
        label={t('home.feeder')}
        value={info.feeder}
      />

      <DetailRow
        icon={DashboardSpeed01Icon}
        label={t('home.meterNo')}
        value={info.meterNo}
        numeric
      />
      <DetailRow
        icon={ElectricPlugsIcon}
        label={t('home.meterType')}
        value={info.meterType}
      />
      <DetailRow
        icon={Activity03Icon}
        label={t('home.meterStatus')}
        value={info.meterStatus}
      />
      <DetailRow
        icon={Calendar03Icon}
        label={t('home.installedAt')}
        // Epoch **seconds**, which is what every backend timestamp here uses —
        // `formatDate` multiplies up, so passing milliseconds lands in the year
        // 54,000 rather than failing visibly.
        value={formatDate(info.meterInstalledAt)}
        numeric
      />
      <DetailRow
        icon={WaveIcon}
        label={t('home.approvedLoad')}
        value={`${formatNumber(info.approvedLoad)} ${t('home.kilowatt')}`}
        numeric
      />
      <DetailRow
        icon={Coins01Icon}
        label={t('home.minimumRecharge')}
        value={formatCurrency(info.minimumRecharge, 0)}
        numeric
      />
    </Card>
  );
}

function DetailRow({
  icon,
  label,
  value,
  numeric = false,
}: {
  icon?: IconSvgElement;
  label: string;
  value: string;
  numeric?: boolean;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailLabel}>
        {/* A step dimmer than the label it sits beside: the icon is there to
            help the eye find the row, not to compete with what the row says.
            Nudged down because a 16pt glyph top-aligned against a 20pt line box
            (22pt in Bangla) reads as floating above the text it labels. */}
        {icon ? (
          <View style={styles.detailIcon}>
            <Icon icon={icon} size={16} color="textTertiary" />
          </View>
        ) : null}
        <Text variant="subhead" color="textSecondary">
          {label}
        </Text>
      </View>

      <Text variant="subhead" numeric={numeric} align="right" style={styles.detailValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  detailLabel: {
    flexDirection: 'row',
    // Not `center`: the row aligns to `flex-start` so a wrapping value stays
    // level with the label, and the icon has to follow the label's first line.
    alignItems: 'flex-start',
    gap: Spacing.sm,
    // Bangla labels run longer than their English counterparts, so the label
    // side yields before the value does.
    flexShrink: 1,
  },
  detailIcon: {
    paddingTop: 2,
  },
  detailValue: {
    flex: 1,
  },
});
