import { useTranslation } from 'react-i18next';

import { amountToInteger, integerToAmount } from 'loot-core/shared/util';
import type { PeriodicTemplate } from 'loot-core/types/models/templates';

import {
  type Action,
  updateTemplate,
} from '@desktop-client/components/budget/goals/actions';
import { FormField, FormLabel } from '@desktop-client/components/forms';
import { AmountInput } from '@desktop-client/components/util/AmountInput';

type WeekAutomationProps = {
  template: PeriodicTemplate;
  dispatch: (action: Action) => void;
};

export const WeekAutomation = ({ template, dispatch }: WeekAutomationProps) => {
  const { t } = useTranslation();

  // Template amounts are stored as dollars (floats) by the parser,
  // convert to cents (integers) for AmountInput
  const amountInCents = amountToInteger(template.amount ?? 0);

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
              // Convert back to dollars for storage
              amount: integerToAmount(valueInCents),
            }),
          )
        }
      />
    </FormField>
  );
};
