import { useTranslation } from 'react-i18next';

import { amountToInteger, integerToAmount } from 'loot-core/shared/util';
import type { SimpleTemplate } from 'loot-core/types/models/templates';

import {
  type Action,
  updateTemplate,
} from '@desktop-client/components/budget/goals/actions';
import { FormField, FormLabel } from '@desktop-client/components/forms';
import { AmountInput } from '@desktop-client/components/util/AmountInput';
import { useFormat } from '@desktop-client/hooks/useFormat';

type SimpleAutomationProps = {
  template: SimpleTemplate;
  dispatch: (action: Action) => void;
};

export const SimpleAutomation = ({
  template,
  dispatch,
}: SimpleAutomationProps) => {
  const { t } = useTranslation();
  const { currency } = useFormat();

  return (
    <FormField>
      <FormLabel title={t('Amount')} htmlFor="amount-field" />
      <AmountInput
        id="amount-field"
        key="amount-input"
        value={amountToInteger(template.monthly ?? 0, currency.decimalPlaces)}
        zeroSign="+"
        onUpdate={(value: number) =>
          dispatch(
            updateTemplate({
              type: 'simple',
              monthly: integerToAmount(value, currency.decimalPlaces),
            }),
          )
        }
      />
    </FormField>
  );
};
