import { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { SvgInformationCircle } from '@actual-app/components/icons/v2';
import { Input } from '@actual-app/components/input';
import { Select } from '@actual-app/components/select';
import { SpaceBetween } from '@actual-app/components/space-between';
import { theme } from '@actual-app/components/theme';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';
import { amountToInteger, integerToAmount } from '@actual-app/core/shared/util';
import type {
  ByTemplate,
  SpendTemplate,
} from '@actual-app/core/types/models/templates';

import { updateTemplate } from '#components/budget/goals/actions';
import { FormField, FormLabel } from '#components/forms';
import { LabeledCheckbox } from '#components/forms/LabeledCheckbox';
import { AmountInput } from '#components/util/AmountInput';
import { GenericInput } from '#components/util/GenericInput';
import { useFormat } from '#hooks/useFormat';
import type { Action } from '#components/budget/goals/actions';

type BySaveAutomationProps = {
  template: ByTemplate | SpendTemplate;
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
      dispatch(updateTemplate({ type: template.type, repeat: parsed }));
    }
  };

  const repeats = !!template.repeat;
  const spendDown = template.type === 'spend';
  const fromMonth = template.type === 'spend' ? template.from : '';

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
                  type: template.type,
                  amount: integerToAmount(value, format.currency.decimalPlaces),
                }),
              )
            }
          />
        </FormField>
        <FormField style={{ flex: 1 }}>
          <FormLabel title={t('Target month')} htmlFor="by-month-field" />
          <GenericInput
            // remount when the stored month changes so the picker re-syncs
            // to day 01 instead of lingering on whatever day the user picked
            key={template.month}
            type="date"
            field="date"
            value={template.month ? `${template.month}-01` : ''}
            onChange={(value: string) =>
              dispatch(
                updateTemplate({
                  type: template.type,
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
                        type: template.type,
                        annual: false,
                        repeat: template.repeat ?? 1,
                      }
                    : {
                        type: template.type,
                        annual: undefined,
                        repeat: undefined,
                      },
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
                    updateTemplate({
                      type: template.type,
                      annual: value === 'year',
                    }),
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
      <SpaceBetween align="center" gap={10} style={{ marginTop: 10 }}>
        <FormField style={{ flex: 1 }}>
          <LabeledCheckbox
            id="by-spend-down-field"
            checked={spendDown}
            onChange={e =>
              dispatch(
                updateTemplate(
                  e.target.checked
                    ? { type: 'spend', from: fromMonth || template.month }
                    : { type: 'by' },
                ),
              )
            }
          >
            <span
              style={{
                marginLeft: 6,
                fontSize: 12,
                whiteSpace: 'nowrap',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
              }}
            >
              <Trans>Allow early spending</Trans>
              {/* tooltip lives inside the checkbox label; stop the click
                  from also toggling the checkbox */}
              <span
                onClick={e => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onMouseDown={e => e.stopPropagation()}
                style={{ display: 'inline-flex' }}
              >
                <Tooltip
                  content={
                    <View style={{ maxWidth: 280 }}>
                      <Trans>
                        Without this, spending before the target month leaves a
                        gap that the next month's contribution has to make up.
                        Turn this on to tell Actual spending is expected from a
                        chosen month onwards, so it doesn't budget more to
                        recover the shortfall.
                      </Trans>
                      <View style={{ marginTop: 6, fontStyle: 'italic' }}>
                        <Trans>
                          Example: budget for Christmas presents by December,
                          with shopping starting in March.
                        </Trans>
                      </View>
                    </View>
                  }
                  placement="top start"
                >
                  <SvgInformationCircle
                    width={12}
                    height={12}
                    style={{ color: theme.pageTextLight, cursor: 'help' }}
                  />
                </Tooltip>
              </span>
            </span>
          </LabeledCheckbox>
        </FormField>
        {spendDown && (
          <FormField style={{ flex: 1 }}>
            <FormLabel
              title={t('Start spending in')}
              htmlFor="by-spend-from-field"
            />
            <GenericInput
              key={fromMonth}
              type="date"
              field="date"
              value={fromMonth ? `${fromMonth}-01` : ''}
              onChange={(value: string) =>
                dispatch(
                  updateTemplate({
                    type: 'spend',
                    from: value ? value.slice(0, 7) : '',
                  }),
                )
              }
            />
          </FormField>
        )}
      </SpaceBetween>
    </>
  );
};
