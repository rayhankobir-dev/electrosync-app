import { IdentityCardIcon, Tag01Icon } from '@hugeicons/core-free-icons';
import { useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';

import { isApiError } from '@/api/errors';
import type { Meter, MeterProvider, MeterType } from '@/api/types';
import { MeterArtwork, MeterTypeLabelKey } from '@/components/meter-artwork';
import { Badge } from '@/components/ui/badge';
import { Banner } from '@/components/ui/banner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Screen } from '@/components/ui/screen';
import { MeterTypePicker } from '@/components/meter-type-picker';
import { ProviderPicker } from '@/components/provider-picker';
import { Text } from '@/components/ui/text';
import { TextField } from '@/components/ui/text-field';
import { useAddMeter, useUpdateMeter } from '@/hooks/use-meters';
import { useI18n, type TranslationKey } from '@/i18n';
import { Spacing } from '@/theme';
import { utilityFor } from '@/utility';

const CUSTOMER_NO = /^\d{6,20}$/;

export function MeterForm({
  visible,
  meter,
  onClose,
}: {
  visible: boolean;
  /** Present means edit. The utility cannot change after creation. */
  meter?: Meter | null;
  onClose(): void;
}) {
  const { t } = useI18n();
  const addMeter = useAddMeter();
  const updateMeter = useUpdateMeter();

  const isEdit = Boolean(meter);

  const [customerNo, setCustomerNo] = useState(meter?.customerNo ?? '');
  const [label, setLabel] = useState(meter?.label ?? '');
  const [type, setType] = useState<MeterType>(meter?.type ?? 'HOME');
  const [provider, setProvider] = useState<MeterProvider>(meter?.provider ?? 'NESCO');
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [formError, setFormError] = useState<TranslationKey | null>(null);

  const submitting = addMeter.isPending || updateMeter.isPending;

  async function handleSubmit() {
    setFormError(null);

    if (!isEdit && !CUSTOMER_NO.test(customerNo.trim())) {
      setFieldError(t('meters.customerNoInvalid'));
      return;
    }
    setFieldError(null);

    try {
      if (meter) {
        // The update DTO accepts only label and isPrimary, so customerNo and
        // type are deliberately not sent.
        await updateMeter.mutateAsync({ id: meter.id, label: label.trim() || undefined });
      } else {
        await addMeter.mutateAsync({
          customerNo: customerNo.trim(),
          type,
          provider,
          label: label.trim() || undefined,
        });
      }
      onClose();
    } catch (error) {
      setFormError(isApiError(error) ? error.messageKey : 'errors.unknown');
    }
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <Screen scrollable>
        <Text variant="title2" style={styles.title}>
          {isEdit ? t('meters.editTitle') : t('meters.addTitle')}
        </Text>

        <View style={styles.form}>
          {formError ? <Banner message={t(formError)} /> : null}

          {meter ? (
            /* Everything that identifies a meter is fixed after creation, so it
               is shown rather than offered: a disabled picker and a greyed-out
               field are controls that lie about being controls. This also puts
               the meter being edited back on screen — without it the sheet was
               a lone text box with no idea which meter it belonged to. */
            <Card>
              <View style={styles.identity}>
                <MeterArtwork type={meter.type} size={48} />
                <View style={styles.identityMeta}>
                  <Text variant="caption" color="textTertiary">
                    {t('meters.customerNo')}
                  </Text>
                  <Text variant="title3" numeric numberOfLines={1}>
                    {meter.customerNo}
                  </Text>
                  <View style={styles.identityBadges}>
                    <Badge
                      label={utilityFor(meter.provider).displayName}
                      tone={utilityFor(meter.provider).supported ? 'neutral' : 'warning'}
                    />
                    <Badge label={t(MeterTypeLabelKey[meter.type])} />
                    {meter.isPrimary ? <Badge label={t('meters.primary')} tone="primary" /> : null}
                  </View>
                </View>
              </View>
            </Card>
          ) : (
            <>
              <View style={styles.field}>
                <Text variant="subhead" color="textSecondary">
                  {t('meters.provider')}
                </Text>
                <ProviderPicker value={provider} onChange={setProvider} />
                {!utilityFor(provider).supported ? (
                  <Banner
                    tone="info"
                    message={t('meters.unsupportedBody', {
                      utility: utilityFor(provider).displayName,
                    })}
                  />
                ) : null}
              </View>

              <View style={styles.field}>
                <Text variant="subhead" color="textSecondary">
                  {t('meters.type')}
                </Text>
                {/* The card art is the preview now, so the separate 72pt
                    MeterArtwork above the control is redundant. */}
                <MeterTypePicker value={type} onChange={setType} />
              </View>

              <TextField
                label={t('meters.customerNo')}
                required
                leadingIcon={IdentityCardIcon}
                placeholder={t('meters.customerNoPlaceholder')}
                value={customerNo}
                onChangeText={setCustomerNo}
                error={fieldError}
                keyboardType="number-pad"
              />
            </>
          )}

          <TextField
            label={t('meters.label')}
            leadingIcon={Tag01Icon}
            placeholder={t('meters.labelPlaceholder')}
            value={label}
            onChangeText={setLabel}
            hint={isEdit ? t('meters.editHint') : undefined}
            maxLength={64}
            autoFocus={isEdit}
          />

          <Button
            label={t('common.save')}
            loading={submitting}
            onPress={() => void handleSubmit()}
            style={styles.submit}
          />
          {/* `secondary`, not `ghost`: a full-width block needs a container to
              read as a button. Ghost has no fill and no border, so at this width
              it looked like an unpainted gap with a label floating in it. */}
          <Button label={t('common.cancel')} variant="secondary" onPress={onClose} />
        </View>
      </Screen>
    </Modal>
  );
}

const styles = StyleSheet.create({
  title: {
    marginBottom: Spacing.lg,
  },
  form: {
    gap: Spacing.lg,
  },
  field: {
    gap: Spacing.sm,
  },
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  identityMeta: {
    flex: 1,
    gap: Spacing.xs,
  },
  identityBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  submit: {
    marginTop: Spacing.sm,
  },
});
