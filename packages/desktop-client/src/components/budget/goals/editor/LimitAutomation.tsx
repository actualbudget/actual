import { Trans, useTranslation } from 'react-i18next';

import { Select } from '@actual-app/components/select';
import { SpaceBetween } from '@actual-app/components/space-between';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import {
  dayFromDate,
  firstDayOfMonth,
  parseDate,
} from '@actual-app/core/shared/months';
import { amountToInteger, integerToAmount } from '@actual-app/core/shared/util';
import type { LimitTemplate } from '@actual-app/core/types/models/templates';
import { css } from '@emotion/css';
import { getDay } from 'date-fns/getDay';
import { setDay } from 'date-fns/setDay';

import { updateTemplate } from '#components/budget/goals/actions';
import type { Action } from '#components/budget/goals/actions';
import { TWO_UP_FIELD_FLEX } from '#components/budget/goals/editor/fieldLayout';
import { FormField, FormLabel } from '#components/forms';
import { LabeledCheckbox } from '#components/forms/LabeledCheckbox';
import { AmountInput } from '#components/util/AmountInput';
import { useDaysOfWeek } from '#hooks/useDaysOfWeek';
import { useFormat } from '#hooks/useFormat';

type LimitAutomationProps = {
  template: LimitTemplate;
  dispatch: (action: Action) => void;
  defaultWeeklyStart?: string;
};

export const LimitAutomation = ({
  template,
  dispatch,
  defaultWeeklyStart,
}: LimitAutomationProps) => {
  const { t } = useTranslation();
  const format = useFormat();
  const daysOfWeek = useDaysOfWeek();

  const period = template.period;
  const amount = amountToInteger(
    template.amount,
    format.currency.decimalPlaces,
  );
  const start =
    template.start ??
    defaultWeeklyStart ??
    dayFromDate(firstDayOfMonth(new Date()));
  const dayOfWeek = getDay(parseDate(start));
  const hold = template.hold;

  const selectButtonClassName = css({
    '&[data-hovered]': {
      backgroundColor: theme.buttonNormalBackgroundHover,
    },
  });

  const weekdayField = (
    <FormField style={{ flex: TWO_UP_FIELD_FLEX }}>
      <FormLabel title={t('Weekday')} htmlFor="weekday-field" />

      <Select
        id="weekday-field"
        value={dayOfWeek.toString()}
        onChange={value =>
          dispatch(
            updateTemplate({
              type: 'limit',
              start: dayFromDate(setDay(parseDate(start), Number(value))),
            }),
          )
        }
        options={Object.entries(daysOfWeek)}
        className={selectButtonClassName}
      />
    </FormField>
  );

  const amountField = (
    <FormField key="amount-field" style={{ flex: TWO_UP_FIELD_FLEX }}>
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

  const cadenceField = (
    <FormField key="cadence-field" style={{ flex: TWO_UP_FIELD_FLEX }}>
      <FormLabel title={t('Every')} htmlFor="cadence-field" />

      <Select
        id="cadence-field"
        value={period}
        onChange={cadence =>
          dispatch(
            cadence === 'weekly' && !template.start
              ? updateTemplate({ type: 'limit', period: cadence, start })
              : updateTemplate({ type: 'limit', period: cadence }),
          )
        }
        options={[
          ['daily', t('Day')],
          ['weekly', t('Week')],
          ['monthly', t('Month')],
        ]}
        className={selectButtonClassName}
      />
    </FormField>
  );

  return (
    <>
      <SpaceBetween align="center" gap={10} style={{ marginTop: 10 }}>
        {amountField}
        {cadenceField}
      </SpaceBetween>

      <Text
        style={{
          fontSize: 12,
          color: theme.pageTextLight,
          display: 'block',
          marginTop: 8,
        }}
      >
        <Trans>
          A weekly or daily cap is multiplied by the number of weeks or days in
          the month, so the effective monthly cap changes with each month. For
          example, a{' '}
          {{
            weekly: format(
              amountToInteger(50, format.currency.decimalPlaces),
              'financial-no-decimals',
            ),
          }}
          /week cap caps the balance at{' '}
          {{
            fourWeeks: format(
              amountToInteger(200, format.currency.decimalPlaces),
              'financial-no-decimals',
            ),
          }}{' '}
          in months with 4 weeks and{' '}
          {{
            fiveWeeks: format(
              amountToInteger(250, format.currency.decimalPlaces),
              'financial-no-decimals',
            ),
          }}{' '}
          in months with 5.
        </Trans>
      </Text>

      <SpaceBetween align="center" gap={10} style={{ marginTop: 10 }}>
        {period === 'weekly' && weekdayField}
        <FormField
          key="hold-overflow-field"
          style={{ flex: TWO_UP_FIELD_FLEX }}
        >
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
