import { useTranslation } from 'react-i18next';

import { Select } from '@actual-app/components/select';
import { Stack } from '@actual-app/components/stack';

import type {
  CopyTemplate,
  AverageTemplate,
} from 'loot-core/types/models/templates';

import {
  type Action,
  updateTemplate,
} from '@desktop-client/components/budget/goals/actions';
import { FormField, FormLabel } from '@desktop-client/components/forms';
import { GenericInput } from '@desktop-client/components/util/GenericInput';

type HistoricalAutomationProps = {
  template: CopyTemplate | AverageTemplate;
  dispatch: (action: Action) => void;
};

export const HistoricalAutomation = ({
  template,
  dispatch,
}: HistoricalAutomationProps) => {
  const { t } = useTranslation();

  return (
    <Stack
      direction="row"
      align="center"
      spacing={10}
      style={{ marginTop: 10 }}
    >
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
        {/* @ts-expect-error should be auto-patched once GenericInput is converted to TS */}
        <GenericInput
          key="look-back-input"
          type="number"
          value={
            template.type === 'average' ? template.numMonths : template.lookBack
          }
          onChange={(value: number) =>
            dispatch(
              updateTemplate(
                template.type === 'average'
                  ? { numMonths: value }
                  : { lookBack: value },
              ),
            )
          }
        />
      </FormField>
    </Stack>
  );
};
