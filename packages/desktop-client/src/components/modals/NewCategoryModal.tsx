import { useTranslation } from 'react-i18next';

import { type Modal } from 'loot-core/client/modals/modalsSlice';

import { ModalHeader, ModalTitle } from '../common/Modal';

import { SingleInputModal } from './SingleInputModal';

type NewCategoryModalProps = Extract<
  Modal,
  { name: 'new-category' }
>['options'];

export function NewCategoryModal({
  onValidate,
  onSubmit,
}: NewCategoryModalProps) {
  const { t } = useTranslation();
  return (
    <SingleInputModal
      name="new-category"
      Header={props => (
        <ModalHeader
          {...props}
          title={<ModalTitle title={t('New Category')} shrinkOnOverflow />}
        />
      )}
      inputPlaceholder={t('Category name')}
      buttonText={t('Add')}
      onValidate={onValidate}
      onSubmit={onSubmit}
    />
  );
}
