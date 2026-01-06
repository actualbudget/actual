import { useTranslation } from 'react-i18next';

import { amountToInteger, integerToAmount } from 'loot-core/shared/util';
import type { PeriodicTemplate } from 'loot-core/types/models/templates';

import {
  type Action,
  updateTemplate,
} from '@desktop-client/components/budget/goals/actions';
import { FormField, FormLabel } from '@desktop-client/components/forms';
import { useFormat } from '@desktop-client/hooks/useFormat';
import { AmountInput } from '@desktop-client/components/util/AmountInput';

type WeekAutomationProps = {
  template: PeriodicTemplate;
  dispatch: (action: Action) => void;
};

export const WeekAutomation = ({ template, dispatch }: WeekAutomationProps) => {
  const { t } = useTranslation();
  const format = useFormat();
  const { decimalPlaces } = format.currency;

  // Template amounts are stored as dollars (floats) by the parser,
  // convert to cents (integers) using currency-aware conversion
  const amountInCents = amountToInteger(template.amount ?? 0, decimalPlaces);

  return (
    <FormField style={{ flex: 1 }}>
      <FormLabel title={t('Amount')} htmlFor="amount-field" />
      <AmountInput
        id="amount-field"
        key="amount-input"
        value={amountInCents}
        zeroSign="+"
        onUpdate={(valueInCents: number) =>
          dispatch(
            updateTemplate({
              type: 'periodic',
              // Convert back to dollars for storage using currency-aware conversion
              amount: integerToAmount(valueInCents, decimalPlaces),
            }),
          )
        }
      />
    </FormField>
  );
};
