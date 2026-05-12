import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Input } from '@actual-app/components/input';
import { Select } from '@actual-app/components/select';
import { SpaceBetween } from '@actual-app/components/space-between';
import { amountToInteger, integerToAmount } from '@actual-app/core/shared/util';
import type { PeriodicTemplate } from '@actual-app/core/types/models/templates';

import { updateTemplate } from '#components/budget/goals/actions';
import type { Action } from '#components/budget/goals/actions';
import { FormField, FormLabel } from '#components/forms';
import { AmountInput } from '#components/util/AmountInput';
import { GenericInput } from '#components/util/GenericInput';
import { useFormat } from '#hooks/useFormat';

type FixedAutomationProps = {
  template: PeriodicTemplate;
  dispatch: (action: Action) => void;
};

type PeriodUnit = 'day' | 'week' | 'month' | 'year';

export const FixedAutomation = ({
  template,
  dispatch,
}: FixedAutomationProps) => {
  const { t } = useTranslation();
  const periodUnitOptions: Array<[PeriodUnit, string]> = [
    ['day', t('days')],
    ['week', t('weeks')],
    ['month', t('months')],
    ['year', t('years')],
  ];
  const format = useFormat();

  const amount = amountToInteger(
    template.amount,
    format.currency.decimalPlaces,
  );
  const periodUnit = template.period?.period ?? 'month';
  const periodAmount = template.period?.amount ?? 1;
  const [rawPeriodAmount, setRawPeriodAmount] = useState(String(periodAmount));
  // Resync when a different automation row is selected (the component
  // instance is reused across rows).
  useEffect(() => {
    setRawPeriodAmount(String(periodAmount));
  }, [periodAmount]);
  const commitPeriodAmount = () => {
    const parsed = Math.max(1, Math.trunc(Number(rawPeriodAmount)) || 1);
    setRawPeriodAmount(String(parsed));
    if (parsed !== periodAmount) {
      dispatch(
        updateTemplate({
          type: 'periodic',
          period: { period: periodUnit, amount: parsed },
        }),
      );
    }
  };

  return (
    <SpaceBetween align="center" gap={10} style={{ marginTop: 10 }}>
      <FormField style={{ flex: 1 }}>
        <FormLabel title={t('Amount')} htmlFor="amount-field" />
        <AmountInput
          id="amount-field"
          value={amount}
          zeroSign="+"
          onUpdate={(value: number) =>
            dispatch(
              updateTemplate({
                type: 'periodic',
                amount: integerToAmount(value, format.currency.decimalPlaces),
              }),
            )
          }
        />
      </FormField>
      <FormField style={{ flex: 1 }}>
        <FormLabel title={t('Every')} htmlFor="period-amount-field" />
        <Input
          id="period-amount-field"
          type="number"
          min={1}
          step={1}
          value={rawPeriodAmount}
          onChangeValue={setRawPeriodAmount}
          onBlur={commitPeriodAmount}
        />
      </FormField>
      <FormField style={{ flex: 1 }}>
        <FormLabel title={t('Period')} htmlFor="period-unit-field" />
        <Select
          id="period-unit-field"
          value={periodUnit}
          onChange={value =>
            dispatch(
              updateTemplate({
                type: 'periodic',
                period: {
                  period: value,
                  amount: periodAmount,
                },
              }),
            )
          }
          options={periodUnitOptions}
        />
      </FormField>
      <FormField style={{ flex: 1 }}>
        <FormLabel title={t('Starting')} htmlFor="starting-field" />
        <GenericInput
          type="date"
          field="date"
          value={template.starting ?? ''}
          onChange={(value: string) =>
            dispatch(updateTemplate({ type: 'periodic', starting: value }))
          }
        />
      </FormField>
    </SpaceBetween>
  );
};
