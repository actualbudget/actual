import { useTranslation } from 'react-i18next';

import { amountToInteger, integerToAmount } from 'loot-core/shared/util';
import type { PeriodicTemplate } from 'loot-core/types/models/templates';

import {
  type Action,
  updateTemplate,
} from '@desktop-client/components/budget/goals/actions';
import { FormField, FormLabel } from '@desktop-client/components/forms';
import { AmountInput } from '@desktop-client/components/util/AmountInput';
import { useFormat } from '@desktop-client/hooks/useFormat';

type WeekAutomationProps = {
  template: PeriodicTemplate;
  dispatch: (action: Action) => void;
};

export const WeekAutomation = ({ template, dispatch }: WeekAutomationProps) => {
  const { t } = useTranslation();
  const { currency } = useFormat();

  return (
    <FormField style={{ flex: 1 }}>
      <FormLabel title={t('Amount')} htmlFor="amount-field" />
      <AmountInput
        id="amount-field"
        key="amount-input"
        value={amountToInteger(template.amount ?? 0, currency.decimalPlaces)}
        zeroSign="+"
        onUpdate={(value: number) =>
          dispatch(
            updateTemplate({
              type: 'periodic',
              amount: integerToAmount(value, currency.decimalPlaces),
            }),
          )
        }
      />
    </FormField>
  );
};
