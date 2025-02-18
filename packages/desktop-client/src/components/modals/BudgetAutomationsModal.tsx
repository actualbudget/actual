import { useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Stack } from '@actual-app/components/stack';
import { theme } from '@actual-app/components/theme';
import { uniqueId } from 'lodash';

import { useSchedules } from 'loot-core/client/data-hooks/schedules';
import { type Template } from 'loot-core/server/budget/types/templates';
import { q } from 'loot-core/shared/query';

import { BudgetAutomation } from '../budget/goals/BudgetAutomation';
import { useBudgetAutomationCategories } from '../budget/goals/useBudgetAutomationCategories';
import { Modal, ModalCloseButton, ModalHeader } from '../common/Modal';

type TemplateWithId = Template & { id: string };

export function BudgetAutomationsModal() {
  const { t } = useTranslation();

  // HACK: This is a placeholder for the actual data.
  // We should eventually load it using a data hook.
  const [templates, setTemplates] = useState<TemplateWithId[]>([
    {
      type: 'average',
      numMonths: 3,
      directive: '',
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
      { type: 'average', numMonths: 3, directive: '', id: uniqueId() },
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
            spacing={2}
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
                  backgroundColor: theme.tableBackground,
                  borderRadius: 4,
                  padding: 8,
                  paddingRight: 12,
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
