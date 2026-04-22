import { useTranslation } from 'react-i18next';

import { Select } from '@actual-app/components/select';
import { SpaceBetween } from '@actual-app/components/space-between';
import { amountToInteger, integerToAmount } from '@actual-app/core/shared/util';
import type { ByTemplate } from '@actual-app/core/types/models/templates';

import { updateTemplate } from '#components/budget/goals/actions';
import type { Action } from '#components/budget/goals/actions';
import { FormField, FormLabel } from '#components/forms';
import { AmountInput } from '#components/util/AmountInput';
import { GenericInput } from '#components/util/GenericInput';
import { useFormat } from '#hooks/useFormat';

type BySaveAutomationProps = {
  template: ByTemplate;
  dispatch: (action: Action) => void;
};

export const BySaveAutomation = ({
  template,
  dispatch,
}: BySaveAutomationProps) => {
  const { t } = useTranslation();
  const format = useFormat();

  const amount = amountToInteger(
    template.amount,
    format.currency.decimalPlaces,
  );

  return (
    <>
      <SpaceBetween align="center" gap={10} style={{ marginTop: 10 }}>
        <FormField style={{ flex: 1 }}>
          <FormLabel title={t('Total amount')} htmlFor="by-amount-field" />
          <AmountInput
            id="by-amount-field"
            value={amount}
            zeroSign="+"
            onUpdate={(value: number) =>
              dispatch(
                updateTemplate({
                  type: 'by',
                  amount: integerToAmount(value, format.currency.decimalPlaces),
                }),
              )
            }
          />
        </FormField>
        <FormField style={{ flex: 1 }}>
          <FormLabel title={t('Target date')} htmlFor="by-month-field" />
          <GenericInput
            type="date"
            field="date"
            value={template.month ? `${template.month}-01` : ''}
            onChange={(value: string) =>
              dispatch(
                updateTemplate({
                  type: 'by',
                  month: value ? value.slice(0, 7) : '',
                }),
              )
            }
          />
        </FormField>
      </SpaceBetween>
      <SpaceBetween align="center" gap={10} style={{ marginTop: 10 }}>
        <FormField style={{ flex: 1 }}>
          <FormLabel
            title={t('Repeat every')}
            htmlFor="by-repeat-amount-field"
          />
          <GenericInput
            type="number"
            value={template.repeat ?? 1}
            onChange={value =>
              dispatch(
                updateTemplate({
                  type: 'by',
                  repeat: Math.max(1, Number(value) || 1),
                }),
              )
            }
          />
        </FormField>
        <FormField style={{ flex: 1 }}>
          <FormLabel title={t('Period')} htmlFor="by-period-field" />
          <Select
            id="by-period-field"
            value={template.annual ? 'year' : 'month'}
            onChange={value =>
              dispatch(updateTemplate({ type: 'by', annual: value === 'year' }))
            }
            options={[
              ['month', t('Months')],
              ['year', t('Years')],
            ]}
          />
        </FormField>
      </SpaceBetween>
    </>
  );
};
