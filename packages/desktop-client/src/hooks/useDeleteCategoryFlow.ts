import { useState } from 'react';

import { send } from '@actual-app/core/platform/client/connection';

type DeleteStep = 'confirm' | 'confirm-transfer';

type UseDeleteCategoryFlowOptions = {
  categoryIds: string[];
  onDelete: (transferCategoryId?: string) => void;
};

export function useDeleteCategoryFlow({
  categoryIds,
  onDelete,
}: UseDeleteCategoryFlowOptions) {
  const [step, setStep] = useState<DeleteStep | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [transferId, setTransferId] = useState<string | null>(null);
  const [hasTransferError, setHasTransferError] = useState(false);

  const start = async () => {
    if (isChecking) {
      return;
    }
    setIsChecking(true);
    try {
      const results = await Promise.all(
        categoryIds.map(id => send('must-category-transfer', { id })),
      );
      setStep(results.some(Boolean) ? 'confirm-transfer' : 'confirm');
    } catch {
      setStep('confirm');
    } finally {
      setIsChecking(false);
    }
  };

  const cancel = () => {
    setStep(null);
    setTransferId(null);
    setHasTransferError(false);
  };

  const selectTransfer = (categoryId: string | null) => {
    setTransferId(categoryId);
    setHasTransferError(false);
  };

  const confirm = () => {
    if (step === 'confirm-transfer' && !transferId) {
      setHasTransferError(true);
      return;
    }
    onDelete(transferId ?? undefined);
  };

  return {
    step,
    transferId,
    hasTransferError,
    start,
    cancel,
    confirm,
    selectTransfer,
  };
}
