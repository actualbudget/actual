import { useTranslation } from 'react-i18next';

import type { SimpleTemplate } from 'loot-core/server/budget/types/templates';

import { FormField, FormLabel } from '../../../forms';
import { AmountInput } from '../../../util/AmountInput';
import { type Action, updateTemplate } from '../actions';

type SimpleAutomationProps = {
  template: SimpleTemplate;
  dispatch: (action: Action) => void;
};

export const SimpleAutomation = ({
  template,
  dispatch,
}: SimpleAutomationProps) => {
  const { t } = useTranslation();

  return (
    <FormField>
      <FormLabel title={t('Amount')} htmlFor="amount-field" />
      <AmountInput
        id="amount-field"
        key="amount-input"
        value={template.monthly ?? 0}
        zeroSign="+"
        onUpdate={(value: number) =>
          dispatch(updateTemplate({ type: 'simple', monthly: value }))
        }
      />
    </FormField>
  );
};
