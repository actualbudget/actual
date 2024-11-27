import { useMemo, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { uniqueId } from 'lodash';

import { useSchedules } from 'loot-core/client/data-hooks/schedules';
import { type Template } from 'loot-core/server/budget/types/templates';
import { q } from 'loot-core/shared/query';

import { useCategories } from '../../hooks/useCategories';
import { EditTemplate } from '../budget/goals/EditTemplate';
import { Button } from '../common/Button2';
import { Modal, ModalCloseButton, ModalHeader } from '../common/Modal';
import { Stack } from '../common/Stack';

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

  const { grouped } = useCategories();
  const categories = useMemo(() => {
    const incomeGroup = grouped.filter(group => group.name === 'Income')[0];
    return [
      {
        id: '',
        name: t('Special categories'),
        categories: [
          { id: 'total', cat_group: '', name: t('Total of all income') },
          {
            id: 'to-budget',
            cat_group: '',
            name: t('Available funds to budget'),
          },
        ],
      },
      { ...incomeGroup, name: t('Income categories') },
    ];
  }, [grouped, t]);

  const onAdd = () => {
    setTemplates([
      ...templates,
      { type: 'average', numMonths: 3, directive: '', id: uniqueId() },
    ]);
  };
  const onEdit = () => {};
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
          <Stack spacing={2} style={{ overflowY: 'scroll' }}>
            {templates.map((template, index) => (
              <EditTemplate
                key={template.id}
                onEdit={onEdit}
                onDelete={onDelete(index)}
                template={template}
                categories={categories}
                schedules={schedules}
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
