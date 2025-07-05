import { useTranslation } from 'react-i18next';

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

  return (
    <FormField style={{ flex: 1 }}>
      <FormLabel title={t('Amount')} htmlFor="amount-field" />
      <AmountInput
        id="amount-field"
        key="amount-input"
        value={template.amount ?? 0}
        zeroSign="+"
        onUpdate={(value: number) =>
          dispatch(updateTemplate({ type: 'periodic', amount: value }))
        }
      />
    </FormField>
  );
};
