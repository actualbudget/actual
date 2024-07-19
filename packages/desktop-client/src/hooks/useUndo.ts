import { useCallback } from 'react';
import { useDispatch } from 'react-redux';

import { undo, redo, addNotification } from 'loot-core/client/actions';
import { type Notification } from 'loot-core/client/state-types/notifications';

type UndoNotification = Pick<
  Notification,
  'type' | 'title' | 'message' | 'messageActions'
>;

type RedoNotification = UndoNotification;

type UndoActions = {
  undo: () => void;
  redo: () => void;
  showUndoNotification: (undoNotification: UndoNotification) => void;
  showRedoNotification: (redoNotification: RedoNotification) => void;
};

const timeout = 3000;

export function useUndo(): UndoActions {
  const dispatch = useDispatch();

  const dispatchUndo = useCallback(() => {
    dispatch(undo());
  }, [dispatch]);

  const dispatchRedo = useCallback(() => {
    dispatch(redo());
  }, [dispatch]);

  const showUndoNotification = useCallback(
    ({
      type = 'message',
      title,
      message,
      messageActions,
    }: UndoNotification) => {
      dispatch(
        addNotification({
          type,
          title,
          message,
          messageActions,
          timeout,
          button: {
            title: 'Undo',
            action: dispatchUndo,
          },
        }),
      );
    },
    [dispatch, dispatchUndo],
  );

  const showRedoNotification = useCallback(
    ({
      type = 'message',
      title,
      message,
      messageActions,
    }: RedoNotification) => {
      dispatch(
        addNotification({
          type,
          title,
          message,
          messageActions,
          timeout,
          button: {
            title: 'Redo',
            action: dispatchRedo,
          },
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
