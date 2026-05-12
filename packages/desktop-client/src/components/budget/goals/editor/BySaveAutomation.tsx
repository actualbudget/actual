import { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Input } from '@actual-app/components/input';
import { Select } from '@actual-app/components/select';
import { SpaceBetween } from '@actual-app/components/space-between';
import { amountToInteger, integerToAmount } from '@actual-app/core/shared/util';
import type { ByTemplate } from '@actual-app/core/types/models/templates';

import { updateTemplate } from '#components/budget/goals/actions';
import type { Action } from '#components/budget/goals/actions';
import { FormField, FormLabel } from '#components/forms';
import { LabeledCheckbox } from '#components/forms/LabeledCheckbox';
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

  const committedRepeat = template.repeat ?? 1;
  const [rawRepeat, setRawRepeat] = useState(String(committedRepeat));
  useEffect(() => {
    setRawRepeat(String(committedRepeat));
  }, [committedRepeat]);
  const commitRepeat = () => {
    const parsed = Math.max(1, Math.trunc(Number(rawRepeat)) || 1);
    setRawRepeat(String(parsed));
    if (parsed !== committedRepeat) {
      dispatch(updateTemplate({ type: 'by', repeat: parsed }));
    }
  };

  const repeats = !!template.repeat;

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
          <LabeledCheckbox
            id="by-repeats-field"
            checked={repeats}
            onChange={e =>
              dispatch(
                updateTemplate(
                  e.target.checked
                    ? {
                        type: 'by',
                        annual: false,
                        repeat: template.repeat ?? 1,
                      }
                    : { type: 'by', annual: undefined, repeat: undefined },
                ),
              )
            }
          >
            <span style={{ marginLeft: 6, fontSize: 12, whiteSpace: 'nowrap' }}>
              <Trans>Repeats</Trans>
            </span>
          </LabeledCheckbox>
        </FormField>
        {repeats && (
          <>
            <FormField style={{ flex: 1 }}>
              <FormLabel
                title={t('Repeat every')}
                htmlFor="by-repeat-amount-field"
              />
              <Input
                id="by-repeat-amount-field"
                type="number"
                min={1}
                step={1}
                value={rawRepeat}
                onChangeValue={setRawRepeat}
                onBlur={commitRepeat}
              />
            </FormField>
            <FormField style={{ flex: 1 }}>
              <FormLabel title={t('Period')} htmlFor="by-period-field" />
              <Select
                id="by-period-field"
                value={template.annual ? 'year' : 'month'}
                onChange={value =>
                  dispatch(
                    updateTemplate({ type: 'by', annual: value === 'year' }),
                  )
                }
                options={[
                  ['month', t('Months')],
                  ['year', t('Years')],
                ]}
              />
            </FormField>
          </>
        )}
      </SpaceBetween>
    </>
  );
};
