import { useCallback } from 'react';
import { useDispatch } from 'react-redux';

import { undo, redo, addNotification } from 'loot-core/client/actions';
import { type Notification } from 'loot-core/client/state-types/notifications';

type UndoActions = {
  undo: () => void;
  redo: () => void;
  showUndoNotification: (undoNotification: Notification) => void;
  showRedoNotification: (redoNotification: Notification) => void;
};

const timeout = 10000;

export function useUndo(): UndoActions {
  const dispatch = useDispatch();

  const dispatchUndo = useCallback(() => {
    dispatch(undo());
  }, [dispatch]);

  const dispatchRedo = useCallback(() => {
    dispatch(redo());
  }, [dispatch]);

  const showUndoNotification = useCallback(
    (notification: Notification) => {
      dispatch(
        addNotification({
          type: 'message',
          timeout,
          button: {
            title: 'Undo',
            action: dispatchUndo,
          },
          ...notification,
        }),
      );
    },
    [dispatch, dispatchUndo],
  );

  const showRedoNotification = useCallback(
    (notificaton: Notification) => {
      dispatch(
        addNotification({
          type: 'message',
          timeout,
          button: {
            title: 'Redo',
            action: dispatchRedo,
          },
          ...notificaton,
        }),
      );
    },
    [dispatch, dispatchRedo],
  );

  return {
    undo: dispatchUndo,
    redo: dispatchRedo,
    showUndoNotification,
    showRedoNotification,
  };
}
