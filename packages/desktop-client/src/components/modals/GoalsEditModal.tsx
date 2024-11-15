import { useTranslation } from 'react-i18next';

import { type Template } from 'loot-core/server/budget/types/templates';

import { EditTemplate } from '../budget/goals/EditTemplate';
import { Modal, ModalCloseButton, ModalHeader } from '../common/Modal';

export function GoalsEditModal() {
  const templates: Template[] = [
    {
      type: 'average',
      amount: 50,
      directive: '',
    },
  ];

  const { t } = useTranslation();
  return (
    <Modal
      name="category-goals-edit"
      containerProps={{ style: { width: 650 } }}
    >
      {({ state: { close } }) => (
        <>
          <ModalHeader
            title={t('Automatically set budgets')}
            rightContent={<ModalCloseButton onPress={close} />}
          />
          <EditTemplate template={templates[0]} />
        </>
      )}
    </Modal>
  );
}

/*
#template 50% of [previous] income
*/
