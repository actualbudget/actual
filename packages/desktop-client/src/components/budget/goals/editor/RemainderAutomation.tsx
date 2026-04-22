import { Trans, useTranslation } from 'react-i18next';

import { SpaceBetween } from '@actual-app/components/space-between';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import type { RemainderTemplate } from '@actual-app/core/types/models/templates';

import { updateTemplate } from '#components/budget/goals/actions';
import type { Action } from '#components/budget/goals/actions';
import { FormField, FormLabel } from '#components/forms';
import { GenericInput } from '#components/util/GenericInput';

type RemainderAutomationProps = {
  template: RemainderTemplate;
  dispatch: (action: Action) => void;
};

export const RemainderAutomation = ({
  template,
  dispatch,
}: RemainderAutomationProps) => {
  const { t } = useTranslation();

  return (
    <SpaceBetween align="center" gap={10} style={{ marginTop: 10 }}>
      <FormField style={{ flex: 1 }}>
        <FormLabel title={t('Weight')} htmlFor="remainder-weight-field" />
        <GenericInput
          type="number"
          value={template.weight ?? 1}
          onChange={value =>
            dispatch(
              updateTemplate({
                type: 'remainder',
                weight: Math.max(1, Math.trunc(Number(value)) || 1),
              }),
            )
          }
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
