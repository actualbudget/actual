import { useTranslation } from 'react-i18next';

import type { WeekTemplate } from 'loot-core/server/budget/types/templates';

import {
  type Action,
  updateTemplate,
} from '@desktop-client/components/budget/goals/actions';
import { FormField, FormLabel } from '@desktop-client/components/forms';
import { AmountInput } from '@desktop-client/components/util/AmountInput';

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
