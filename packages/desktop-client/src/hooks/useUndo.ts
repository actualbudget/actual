import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import { useResponsive } from '@actual-app/components/hooks/useResponsive';

import { addNotification } from '#notifications/notificationsSlice';
import type { Notification } from '#notifications/notificationsSlice';
import { useDispatch } from '#redux';
import { redo, undo } from '#undo';

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
  const { t } = useTranslation();

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
              title: t('Undo'),
              action: undo,
            },
            ...notification,
          },
        }),
      );
    },
    [dispatch, isNarrowWidth, t],
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
              title: t('Redo'),
              action: redo,
            },
            ...notification,
          },
        }),
      );
    },
    [dispatch, isNarrowWidth, t],
  );

  return {
    undo,
    redo,
    showUndoNotification,
    showRedoNotification,
  };
}
