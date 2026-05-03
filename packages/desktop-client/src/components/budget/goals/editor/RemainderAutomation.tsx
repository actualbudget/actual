import { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Input } from '@actual-app/components/input';
import { SpaceBetween } from '@actual-app/components/space-between';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import type { RemainderTemplate } from '@actual-app/core/types/models/templates';

import { updateTemplate } from '#components/budget/goals/actions';
import type { Action } from '#components/budget/goals/actions';
import { FormField, FormLabel } from '#components/forms';

type RemainderAutomationProps = {
  template: RemainderTemplate;
  dispatch: (action: Action) => void;
};

export const RemainderAutomation = ({
  template,
  dispatch,
}: RemainderAutomationProps) => {
  const { t } = useTranslation();
  const committedWeight = template.weight ?? 1;
  // Track the raw input so the user can clear and retype without the field
  // snapping back. Commit (and clamp) on blur.
  const [rawWeight, setRawWeight] = useState(String(committedWeight));
  useEffect(() => {
    setRawWeight(String(committedWeight));
  }, [committedWeight]);

  const commitWeight = () => {
    const parsed = Math.max(1, Math.trunc(Number(rawWeight)) || 1);
    setRawWeight(String(parsed));
    if (parsed !== committedWeight) {
      dispatch(updateTemplate({ type: 'remainder', weight: parsed }));
    }
  };

  return (
    <SpaceBetween align="center" gap={10} style={{ marginTop: 10 }}>
      <FormField style={{ flex: 1 }}>
        <FormLabel title={t('Weight')} htmlFor="remainder-weight-field" />
        <Input
          id="remainder-weight-field"
          type="number"
          min={1}
          step={1}
          value={rawWeight}
          onChangeValue={setRawWeight}
          onBlur={commitWeight}
        />
      </FormField>
      <Text style={{ flex: 2, color: theme.pageTextSubdued, fontSize: 12 }}>
        <Trans>
          Categories with higher weights get a bigger share of the leftover To
          Budget.
        </Trans>
      </Text>
    </SpaceBetween>
  );
};
