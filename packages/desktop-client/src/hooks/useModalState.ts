import { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { popModal } from 'loot-core/client/actions';
import { type State } from 'loot-core/client/state-types';
import { type Modal } from 'loot-core/client/state-types/modals';

type ModalState = {
  onClose: () => void;
  modalStack: Modal[];
  activeModal?: string;
  isActive: (name: string) => boolean;
  isHidden: boolean;
};

export function useModalState(): ModalState {
  const modalStack = useSelector((state: State) => state.modals.modalStack);
  const isHidden = useSelector((state: State) => state.modals.isHidden);
  const dispatch = useDispatch();

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
