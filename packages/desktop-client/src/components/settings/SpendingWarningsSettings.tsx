import React, { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Input } from '@actual-app/components/input';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import {
  SPENDING_WARNING_LIMITS,
  spendingWarningPrefKey,
} from '#components/budget/spendingAlerts';
import type {
  SpendingWarningField,
  SpendingWarningTier,
} from '#components/budget/spendingAlerts';
import { useSpendingWarningThresholds } from '#components/budget/useCategorySpendingAlert';
import { FormLabel } from '#components/forms';
import { useSyncedPrefs } from '#hooks/useSyncedPrefs';

import { SettingsRow } from './SettingsRow';

const TIERS: SpendingWarningTier[] = ['warn50', 'warn80'];
const FIELDS: SpendingWarningField[] = ['percent', 'days'];

export function SpendingWarningsSettings() {
  const { t } = useTranslation();
  const thresholds = useSpendingWarningThresholds();
  const [, setPrefs] = useSyncedPrefs();
  // Bumped to reset the fields after an invalid or empty entry
  const [resetCount, setResetCount] = useState(0);

  const currentValue = (
    tier: SpendingWarningTier,
    field: SpendingWarningField,
  ) =>
    field === 'percent'
      ? thresholds[tier].minPercentSpent
      : thresholds[tier].minDaysRemaining;

  const tierTitle = (tier: SpendingWarningTier) =>
    tier === 'warn50' ? t('First warning') : t('Second warning');
  const fieldLabel = (field: SpendingWarningField) =>
    field === 'percent'
      ? t('Budget used (%)')
      : t('At least this many days left');

  return (
    <SettingsRow
      title={t('Spending warnings')}
      description={
        <Text>
          <Trans>
            In the current month, a category&apos;s balance turns brown when it
            has used a share of its budget while enough days are still left. The
            budget includes money rolled over from last month. Red still means
            overspent.
          </Trans>
        </Text>
      }
    >
      <View style={{ gap: 12 }}>
        {TIERS.map(tier => (
          <View key={tier} style={{ gap: 4 }}>
            <Text style={{ fontWeight: 500, color: theme.pageText }}>
              {tierTitle(tier)}
            </Text>
            <View style={{ flexDirection: 'row', gap: 16, flexWrap: 'wrap' }}>
              {FIELDS.map(field => {
                const id = `settings-${spendingWarningPrefKey(tier, field)}`;
                const value = currentValue(tier, field);
                const { min, max } = SPENDING_WARNING_LIMITS[field];
                return (
                  <View key={field}>
                    <FormLabel title={fieldLabel(field)} htmlFor={id} />
                    <Input
                      // Remount to show the active value after an invalid or
                      // empty entry
                      key={`${id}-${value}-${resetCount}`}
                      id={id}
                      type="number"
                      min={min}
                      max={max}
                      defaultValue={String(value)}
                      style={{ width: 80 }}
                      onUpdate={newValue => {
                        const number = Number(newValue);
                        const isValid =
                          newValue === '' ||
                          (Number.isInteger(number) &&
                            number >= min &&
                            number <= max);
                        if (isValid) {
                          // An empty value goes back to the default
                          setPrefs({
                            [spendingWarningPrefKey(tier, field)]: newValue,
                          });
                          if (newValue === '') {
                            // Show the default even if it was already in use
                            setResetCount(count => count + 1);
                          }
                        } else {
                          setResetCount(count => count + 1);
                        }
                      }}
                    />
                  </View>
                );
              })}
            </View>
          </View>
        ))}
        <View>
          <Button
            variant="bare"
            style={{ alignSelf: 'flex-start' }}
            onPress={() =>
              setPrefs(
                Object.fromEntries(
                  TIERS.flatMap(tier =>
                    FIELDS.map(field => [
                      spendingWarningPrefKey(tier, field),
                      '',
                    ]),
                  ),
                ),
              )
            }
          >
            <Trans>Reset to defaults</Trans>
          </Button>
        </View>
      </View>
    </SettingsRow>
  );
}
