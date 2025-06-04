import { useTranslation } from 'react-i18next';

import { SingleInputModal } from './SingleInputModal';

import {
  ModalHeader,
  ModalTitle,
} from '@desktop-client/components/common/Modal';
import { type Modal } from '@desktop-client/modals/modalsSlice';

type NewCategoryGroupModalProps = Extract<
  Modal,
  { name: 'new-category-group' }
>['options'];

export function NewCategoryGroupModal({
  onValidate,
  onSubmit,
}: NewCategoryGroupModalProps) {
  const { t } = useTranslation();
  return (
    <SingleInputModal
      name="new-category-group"
      Header={props => (
        <ModalHeader
          {...props}
          title={
            <ModalTitle title={t('New Category Group')} shrinkOnOverflow />
          }
        />
      )}
      inputPlaceholder={t('Category group name')}
      buttonText={t('Add')}
      onValidate={onValidate}
      onSubmit={onSubmit}
    />
  );
}
