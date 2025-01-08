import { useCallback } from 'react';

import { popModal } from 'loot-core/client/actions';
import { type Modal } from 'loot-core/client/state-types/modals';

import { useAppSelector, useAppDispatch } from '../redux';

type ModalState = {
  onClose: () => void;
  modalStack: Modal[];
  activeModal?: string;
  isActive: (name: string) => boolean;
  isHidden: boolean;
};

export function useModalState(): ModalState {
  const modalStack = useAppSelector(state => state.modals.modalStack);
  const isHidden = useAppSelector(state => state.modals.isHidden);
  const dispatch = useAppDispatch();

  const popModalCallback = useCallback(() => {
    dispatch(popModal());
  }, [dispatch]);

  const lastModal = modalStack[modalStack.length - 1];
  const isActive = useCallback(
    (name: string) => {
      if (!lastModal || name === lastModal.name) {
        return true;
      }

      return false;
    },
    [lastModal],
  );

  return {
    onClose: popModalCallback,
    modalStack,
    activeModal: lastModal?.name,
    isActive,
    isHidden,
  };
}
