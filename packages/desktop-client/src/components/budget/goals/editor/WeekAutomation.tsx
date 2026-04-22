import { useTranslation } from 'react-i18next';

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

type WeekAutomationProps = {
  template: PeriodicTemplate;
  dispatch: (action: Action) => void;
};

const PERIOD_UNITS: Array<['day' | 'week' | 'month' | 'year', string]> = [
  ['day', 'days'],
  ['week', 'weeks'],
  ['month', 'months'],
  ['year', 'years'],
];

export const WeekAutomation = ({ template, dispatch }: WeekAutomationProps) => {
  const { t } = useTranslation();
  const format = useFormat();

  const amount = amountToInteger(
    template.amount,
    format.currency.decimalPlaces,
  );
  const periodUnit = template.period?.period ?? 'month';
  const periodAmount = template.period?.amount ?? 1;

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
        <GenericInput
          type="number"
          value={periodAmount}
          onChange={value =>
            dispatch(
              updateTemplate({
                type: 'periodic',
                period: {
                  period: periodUnit,
                  amount: Math.max(1, Math.trunc(Number(value)) || 1),
                },
              }),
            )
          }
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
          options={PERIOD_UNITS.map(([key, label]) => [key, t(label)])}
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
