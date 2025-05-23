import { useTranslation } from 'react-i18next';

import { SingleInputModal } from './SingleInputModal';

import {
  ModalHeader,
  ModalTitle,
} from '@desktop-client/components/common/Modal';
import { type Modal } from '@desktop-client/modals/modalsSlice';

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
