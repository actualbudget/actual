import { useCallback } from 'react';

import {
  addNotification,
  type Notification,
} from 'loot-core/client/notifications/notificationsSlice';
import { redo, undo } from 'loot-core/client/undo';

import { useResponsive } from '../components/responsive/ResponsiveProvider';
import { useDispatch } from '../redux';

type UndoActions = {
  undo: () => void;
  redo: () => void;
  showUndoNotification: (undoNotification: Notification) => void;
  showRedoNotification: (redoNotification: Notification) => void;
};

const timeout = 10000;

export function useUndo(): UndoActions {
  const dispatch = useDispatch();
  const { isNarrowWidth } = useResponsive();

  const showUndoNotification = useCallback(
    (notification: Notification) => {
      if (!isNarrowWidth) {
        return;
      }

      dispatch(
        addNotification({
          type: 'message',
          timeout,
          button: {
            title: 'Undo',
            action: undo,
          },
          ...notification,
        }),
      );
    },
    [dispatch, isNarrowWidth],
  );

  const showRedoNotification = useCallback(
    (notification: Notification) => {
      if (!isNarrowWidth) {
        return;
      }

      dispatch(
        addNotification({
          type: 'message',
          timeout,
          button: {
            title: 'Redo',
            action: redo,
          },
          ...notification,
        }),
      );
    },
    [dispatch, isNarrowWidth],
  );

  return {
    undo,
    redo,
    showUndoNotification,
    showRedoNotification,
  };
}
