import { useTranslation } from 'react-i18next';

import type { WeekTemplate } from 'loot-core/server/budget/types/templates';

import { FormField, FormLabel } from '../../../forms';
import { AmountInput } from '../../../util/AmountInput';
import { type Action, updateTemplate } from '../actions';

type WeekAutomationProps = {
  template: WeekTemplate;
  dispatch: (action: Action) => void;
};

export const WeekAutomation = ({ template, dispatch }: WeekAutomationProps) => {
  const { t } = useTranslation();

  return (
    <FormField style={{ flex: 1 }}>
      <FormLabel title={t('Amount')} htmlFor="amount-field" />
      <AmountInput
        id="amount-field"
        key="amount-input"
        value={template.amount ?? 0}
        zeroSign="+"
        onUpdate={(value: number) =>
          dispatch(updateTemplate({ type: 'week', amount: value }))
        }
      />
    </FormField>
  );
};
