import { useTranslation } from 'react-i18next';

import { SpaceBetween } from '@actual-app/components/space-between';
import { amountToInteger, integerToAmount } from '@actual-app/core/shared/util';
import type { GoalTemplate } from '@actual-app/core/types/models/templates';

import { updateTemplate } from '#components/budget/goals/actions';
import type { Action } from '#components/budget/goals/actions';
import { FormField, FormLabel } from '#components/forms';
import { AmountInput } from '#components/util/AmountInput';
import { useFormat } from '#hooks/useFormat';

type LongTermGoalAutomationProps = {
  template: GoalTemplate;
  dispatch: (action: Action) => void;
};

export function LongTermGoalAutomation({
  template,
  dispatch,
}: LongTermGoalAutomationProps) {
  const { t } = useTranslation();
  const format = useFormat();
  const amount = amountToInteger(
    template.amount,
    format.currency.decimalPlaces,
  );

  return (
    <SpaceBetween align="center" gap={10} style={{ marginTop: 10 }}>
      <FormField style={{ flex: 1 }}>
        <FormLabel title={t('Target amount')} htmlFor="goal-amount-field" />
        <AmountInput
          id="goal-amount-field"
          value={amount}
          sign="+"
          onUpdate={(value: number) =>
            dispatch(
              updateTemplate({
                type: 'goal',
                amount: integerToAmount(value, format.currency.decimalPlaces),
              }),
            )
          }
        />
      </FormField>
    </SpaceBetween>
  );
}
