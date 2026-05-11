import { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Input } from '@actual-app/components/input';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import {
  currencyToInteger,
  integerToCurrency,
} from '@actual-app/core/shared/util';
import type { SavingsPlanEntity } from '@actual-app/core/types/models';

import { FormField, FormLabel } from '#components/forms';

type SavingsPlanFormProps = {
  plan?: SavingsPlanEntity | null;
  onSave: (plan: Omit<SavingsPlanEntity, 'id'>) => void;
  onCancel: () => void;
};

export function SavingsPlanForm({
  plan,
  onSave,
  onCancel,
}: SavingsPlanFormProps) {
  const { t } = useTranslation();

  const [name, setName] = useState(plan?.name ?? '');
  const [targetAmountStr, setTargetAmountStr] = useState(
    plan ? integerToCurrency(plan.target_amount) : '',
  );
  const [savedAmountStr, setSavedAmountStr] = useState(
    plan ? integerToCurrency(plan.saved_amount) : '0',
  );
  const [months, setMonths] = useState(String(plan?.months ?? ''));
  const [startMonth, setStartMonth] = useState(plan?.start_month ?? '');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setName(plan?.name ?? '');
    setTargetAmountStr(plan ? integerToCurrency(plan.target_amount) : '');
    setSavedAmountStr(plan ? integerToCurrency(plan.saved_amount) : '0');
    setMonths(String(plan?.months ?? ''));
    setStartMonth(plan?.start_month ?? '');
    setError(null);
  }, [plan]);

  function handleSubmit() {
    const targetAmount = currencyToInteger(targetAmountStr);
    const savedAmount = currencyToInteger(savedAmountStr);
    const monthsNum = Number(months);

    if (!name.trim()) {
      setError(t('Enter a plan name.'));
      return;
    }
    if (targetAmount == null || targetAmount <= 0) {
      setError(t('Enter a target amount greater than zero.'));
      return;
    }
    if (savedAmount == null || savedAmount < 0) {
      setError(t('Enter a saved amount of zero or more.'));
      return;
    }
    if (!/^\d+$/.test(months.trim()) || monthsNum <= 0) {
      setError(t('Enter a whole number of months greater than zero.'));
      return;
    }

    onSave({
      name: name.trim(),
      target_amount: targetAmount,
      saved_amount: savedAmount,
      months: monthsNum,
      start_month: startMonth || null,
      status: savedAmount >= targetAmount ? 'completed' : 'active',
    });
  }

  return (
    <View
      style={{
        backgroundColor: theme.cardBackground,
        borderRadius: 8,
        border: `1px solid ${theme.cardBorder}`,
        padding: 20,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      }}
    >
      <Text
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: theme.pageText,
          marginBottom: 16,
        }}
      >
        {plan ? t('Edit Savings Plan') : t('New Savings Plan')}
      </Text>

      {error && (
        <Text style={{ color: theme.errorText, marginBottom: 12 }}>
          {error}
        </Text>
      )}

      <View style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <FormField>
          <FormLabel title={t('Plan Name')} htmlFor="sp-name" />
          <Input
            id="sp-name"
            value={name}
            onChangeValue={setName}
            placeholder={t('e.g. Vacation Fund')}
          />
        </FormField>

        <View
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
          }}
        >
          <FormField>
            <FormLabel title={t('Target Amount')} htmlFor="sp-target" />
            <Input
              id="sp-target"
              value={targetAmountStr}
              onChangeValue={setTargetAmountStr}
              placeholder="2000"
            />
          </FormField>

          <FormField>
            <FormLabel title={t('Already Saved')} htmlFor="sp-saved" />
            <Input
              id="sp-saved"
              value={savedAmountStr}
              onChangeValue={setSavedAmountStr}
              placeholder="0"
            />
          </FormField>
        </View>

        <View
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 12,
          }}
        >
          <FormField>
            <FormLabel title={t('Plan Months')} htmlFor="sp-months" />
            <Input
              id="sp-months"
              value={months}
              onChangeValue={setMonths}
              placeholder="12"
            />
          </FormField>

          <FormField>
            <FormLabel title={t('Start Month')} htmlFor="sp-start" />
            <Input
              id="sp-start"
              value={startMonth}
              onChangeValue={setStartMonth}
              placeholder="2026-04"
            />
          </FormField>
        </View>

        <View
          style={{
            flexDirection: 'row',
            justifyContent: 'flex-end',
            gap: 8,
            marginTop: 4,
          }}
        >
          <Button variant="bare" onPress={onCancel}>
            <Trans>Cancel</Trans>
          </Button>
          <Button variant="primary" onPress={handleSubmit}>
            {plan ? t('Save Changes') : t('Create Plan')}
          </Button>
        </View>
      </View>
    </View>
  );
}
