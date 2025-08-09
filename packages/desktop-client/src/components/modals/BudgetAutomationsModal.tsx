import { useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Stack } from '@actual-app/components/stack';
import { theme } from '@actual-app/components/theme';
import { uniqueId } from 'lodash';

import { q } from 'loot-core/shared/query';
import { type Template } from 'loot-core/types/models/templates';

import { BudgetAutomation } from '@desktop-client/components/budget/goals/BudgetAutomation';
import { DEFAULT_PRIORITY } from '@desktop-client/components/budget/goals/reducer';
import { useBudgetAutomationCategories } from '@desktop-client/components/budget/goals/useBudgetAutomationCategories';
import {
  Modal,
  ModalCloseButton,
  ModalHeader,
} from '@desktop-client/components/common/Modal';
import { useSchedules } from '@desktop-client/hooks/useSchedules';

type TemplateWithId = Template & { id: string };

export function BudgetAutomationsModal() {
  const { t } = useTranslation();

  // HACK: This is a placeholder for the actual data.
  // We should eventually load it using a data hook.
  const [templates, setTemplates] = useState<TemplateWithId[]>([
    {
      type: 'average',
      numMonths: 3,
      directive: 'template',
      priority: DEFAULT_PRIORITY,
      id: uniqueId(),
    },
  ]);

  const schedulesQuery = useMemo(() => q('schedules').select('*'), []);
  const { schedules } = useSchedules({
    query: schedulesQuery,
  });

  const categories = useBudgetAutomationCategories();

  const onAdd = () => {
    setTemplates([
      ...templates,
      {
        type: 'average',
        numMonths: 3,
        directive: 'template',
        priority: DEFAULT_PRIORITY,
        id: uniqueId(),
      },
    ]);
  };
  const onSave = () => {};
  const onDelete = (index: number) => () => {
    setTemplates([...templates.slice(0, index), ...templates.slice(index + 1)]);
  };

  return (
    <Modal
      name="category-automations-edit"
      containerProps={{
        style: { width: 850, height: 650, paddingBottom: 20 },
      }}
    >
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={t('Budget automations')}
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <Stack
            spacing={4}
            style={{
              overflowY: 'scroll',
            }}
          >
            {templates.map((template, index) => (
              <BudgetAutomation
                key={template.id}
                onSave={onSave}
                onDelete={onDelete(index)}
                template={template}
                categories={categories}
                schedules={schedules}
                readOnlyStyle={{
                  color: theme.pillText,
                  backgroundColor: theme.pillBackground,
                  borderRadius: 4,
                  padding: 16,
                  paddingLeft: 30,
                  paddingRight: 16,
                }}
              />
            ))}
            <Button onPress={onAdd}>
              <Trans>Add new automation</Trans>
            </Button>
          </Stack>
        </>
      )}
    </Modal>
  );
}
