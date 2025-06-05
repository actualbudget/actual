import { useCallback } from 'react';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';

import {
  addNotification,
  type Notification,
} from '@desktop-client/notifications/notificationsSlice';
import { useDispatch } from '@desktop-client/redux';
import { redo, undo } from '@desktop-client/undo';

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
          notification: {
            type: 'message',
            timeout,
            button: {
              title: 'Undo',
              action: undo,
            },
            ...notification,
          },
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
          notification: {
            type: 'message',
            timeout,
            button: {
              title: 'Redo',
              action: redo,
            },
            ...notification,
          },
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
