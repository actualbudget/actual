import { Trans, useTranslation } from 'react-i18next';

import { Select } from '@actual-app/components/select';
import { SpaceBetween } from '@actual-app/components/space-between';
import { theme } from '@actual-app/components/theme';
import {
  currentDate,
  dayFromDate,
  parseDate,
} from '@actual-app/core/shared/months';
import { amountToInteger, integerToAmount } from '@actual-app/core/shared/util';
import type { LimitTemplate } from '@actual-app/core/types/models/templates';
import { css } from '@emotion/css';
import { getDay } from 'date-fns/getDay';
import { setDay } from 'date-fns/setDay';

import { updateTemplate } from '#components/budget/goals/actions';
import type { Action } from '#components/budget/goals/actions';
import { FormField, FormLabel } from '#components/forms';
import { LabeledCheckbox } from '#components/forms/LabeledCheckbox';
import { AmountInput } from '#components/util/AmountInput';
import { useDaysOfWeek } from '#hooks/useDaysOfWeek';
import { useFormat } from '#hooks/useFormat';

type LimitAutomationProps = {
  template: LimitTemplate;
  dispatch: (action: Action) => void;
};

export const LimitAutomation = ({
  template,
  dispatch,
}: LimitAutomationProps) => {
  const { t } = useTranslation();
  const format = useFormat();
  const daysOfWeek = useDaysOfWeek();

  const period = template.period;
  const amount = amountToInteger(
    template.amount,
    format.currency.decimalPlaces,
  );
  const start = template.start;
  const dayOfWeek = start ? getDay(parseDate(start)) : 0;
  const hold = template.hold;

  const selectButtonClassName = css({
    '&[data-hovered]': {
      backgroundColor: theme.buttonNormalBackgroundHover,
    },
  });

  const weekdayField = (
    <FormField style={{ flex: 1 }}>
      <FormLabel title={t('Weekday')} htmlFor="weekday-field" />

      <Select
        id="weekday-field"
        value={dayOfWeek.toString()}
        onChange={value =>
          dispatch(
            updateTemplate({
              type: 'limit',
              start: dayFromDate(setDay(currentDate(), Number(value))),
            }),
          )
        }
        options={Object.entries(daysOfWeek)}
        className={selectButtonClassName}
      />
    </FormField>
  );

  const amountField = (
    <FormField key="amount-field" style={{ flex: 1 }}>
      <FormLabel title={t('Amount')} htmlFor="amount-field" />
      <AmountInput
        id="amount-field"
        value={amount}
        zeroSign="+"
        onUpdate={(value: number) =>
          dispatch(
            updateTemplate({
              type: 'limit',
              amount: integerToAmount(value, format.currency.decimalPlaces),
            }),
          )
        }
      />
    </FormField>
  );

  return (
    <>
      <SpaceBetween align="center" gap={10} style={{ marginTop: 10 }}>
        <FormField key="cadence-field" style={{ flex: 1 }}>
          <FormLabel title={t('Cadence')} htmlFor="cadence-field" />

          <Select
            id="cadence-field"
            value={period}
            onChange={cadence =>
              dispatch(updateTemplate({ type: 'limit', period: cadence }))
            }
            options={[
              ['daily', t('Daily')],
              ['weekly', t('Weekly')],
              ['monthly', t('Monthly')],
            ]}
            className={selectButtonClassName}
          />
        </FormField>
        {period === 'weekly' ? weekdayField : amountField}
      </SpaceBetween>

      <SpaceBetween align="center" gap={10} style={{ marginTop: 10 }}>
        {period === 'weekly' && amountField}
        <FormField key="hold-overflow-field" style={{ flex: 1 }}>
          <LabeledCheckbox
            id="hold-overflow-field"
            checked={!!hold}
            onChange={e =>
              dispatch(
                updateTemplate({ type: 'limit', hold: e.target.checked }),
              )
            }
          >
            <span style={{ marginLeft: 6, fontSize: 12, whiteSpace: 'nowrap' }}>
              <Trans>Retain existing funds over the cap</Trans>
            </span>
          </LabeledCheckbox>
        </FormField>
      </SpaceBetween>
    </>
  );
};
