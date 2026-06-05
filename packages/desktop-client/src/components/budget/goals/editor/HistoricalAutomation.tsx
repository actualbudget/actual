import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Input } from '@actual-app/components/input';
import { Select } from '@actual-app/components/select';
import { SpaceBetween } from '@actual-app/components/space-between';
import type {
  AverageTemplate,
  CopyTemplate,
} from '@actual-app/core/types/models/templates';

import { updateTemplate } from '#components/budget/goals/actions';
import type { Action } from '#components/budget/goals/actions';
import { AmountAdjustment } from '#components/budget/goals/editor/AmountAdjustment';
import { FormField, FormLabel } from '#components/forms';

type HistoricalAutomationProps = {
  template: CopyTemplate | AverageTemplate;
  dispatch: (action: Action) => void;
};

export const HistoricalAutomation = ({
  template,
  dispatch,
}: HistoricalAutomationProps) => {
  const { t } = useTranslation();

  const months =
    template.type === 'average' ? template.numMonths : template.lookBack;
  const [rawMonths, setRawMonths] = useState(String(months));
  useEffect(() => {
    setRawMonths(String(months));
  }, [months]);

  const commitMonths = () => {
    const parsed = Math.max(1, Math.trunc(Number(rawMonths)) || 1);
    setRawMonths(String(parsed));
    if (parsed === months) return;
    dispatch(
      updateTemplate(
        template.type === 'average'
          ? { type: 'average', numMonths: parsed }
          : { type: 'copy', lookBack: parsed },
      ),
    );
  };

  return (
    <>
      <SpaceBetween gap={50} style={{ marginTop: 10 }}>
        <FormField style={{ flex: 1 }}>
          <FormLabel title={t('Mode')} htmlFor="mode-field" />
          <Select
            id="mode-field"
            key="mode-picker"
            options={[
              ['copy', t('Copy a previous month')],
              ['average', t('Average of previous months')],
            ]}
            value={template.type}
            onChange={type => dispatch(updateTemplate({ type }))}
          />
        </FormField>
        <FormField style={{ flex: 1 }}>
          <FormLabel
            title={t('Number of months back')}
            htmlFor="look-back-field"
          />
          <Input
            id="look-back-field"
            type="number"
            min={1}
            step={1}
            value={rawMonths}
            onChangeValue={setRawMonths}
            onBlur={commitMonths}
          />
        </FormField>
      </SpaceBetween>
      {template.type === 'average' && (
        <AmountAdjustment template={template} dispatch={dispatch} />
      )}
    </>
  );
};
