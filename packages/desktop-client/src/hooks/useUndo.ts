import { useCallback } from 'react';
import { useDispatch } from 'react-redux';

import { undo, redo, addNotification } from 'loot-core/client/actions';
import { type Notification } from 'loot-core/client/state-types/notifications';

type UndoNotification = Pick<
  Notification,
  'type' | 'title' | 'message' | 'messageActions'
>;

type RedoNotification = Pick<
  Notification,
  'type' | 'title' | 'message' | 'messageActions'
>;

type UndoActions = {
  undo: typeof undo;
  redo: typeof redo;
  showUndoNotification: (undoNotification: UndoNotification) => void;
  showRedoNotification: (redoNotification: RedoNotification) => void;
};

export function useUndo(): UndoActions {
  const dispatch = useDispatch();
  const showUndoNotification = useCallback(
    ({ type = 'message', title = 'Undo?', message, messageActions }) => {
      dispatch(
        addNotification({
          type,
          title,
          message,
          messageActions,
          sticky: true,
          button: {
            title: 'Undo',
            action: async () => {
              await dispatch(undo());
            },
          },
        }),
      );
    },
    [dispatch],
  );

  const showRedoNotification = useCallback(
    ({ type = 'message', title = 'Redo?', message, messageActions }) => {
      dispatch(
        addNotification({
          type,
          title,
          message,
          messageActions,
          sticky: true,
          button: {
            title: 'Redo',
            action: async () => {
              await dispatch(redo());
            },
          },
        }),
      );
    },
    [dispatch],
  );

  return {
    undo,
    redo,
    showUndoNotification,
    showRedoNotification,
  };
}
