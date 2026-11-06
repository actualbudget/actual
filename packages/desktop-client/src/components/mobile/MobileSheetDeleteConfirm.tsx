import { useTranslation } from 'react-i18next';

import type {
  CategoryEntity,
  CategoryGroupEntity,
} from '@actual-app/core/types/models';

import { CategoryDeleteMessage } from '#components/budget/CategoryDeleteMessage';
import type { useDeleteCategoryFlow } from '#hooks/useDeleteCategoryFlow';

import { MobileSheetCategoryPicker } from './MobileSheetCategoryPicker';
import { MobileSheetConfirm } from './MobileSheetConfirm';

type MobileSheetDeleteConfirmProps = {
  flow: ReturnType<typeof useDeleteCategoryFlow>;
  category?: CategoryEntity;
  group?: CategoryGroupEntity;
  transferGroups: CategoryGroupEntity[];
  transferName?: string;
};

export function MobileSheetDeleteConfirm({
  flow,
  category,
  group,
  transferGroups,
  transferName,
}: MobileSheetDeleteConfirmProps) {
  const { t } = useTranslation();
  const needsTransfer = flow.step === 'confirm-transfer';
  const name = (category ?? group)?.name ?? '';

  return (
    <MobileSheetConfirm
      message={t('Delete {{name}}?', { name })}
      detail={
        needsTransfer && (
          <CategoryDeleteMessage category={category} group={group} />
        )
      }
      error={
        flow.hasTransferError ? t('You must select a category') : undefined
      }
      confirmLabel={t('Delete')}
      isDestructive
      onCancel={flow.cancel}
      onConfirm={flow.confirm}
    >
      {needsTransfer && (
        <MobileSheetCategoryPicker
          categoryGroups={transferGroups}
          valueName={transferName}
          onSelect={flow.selectTransfer}
        />
      )}
    </MobileSheetConfirm>
  );
}
