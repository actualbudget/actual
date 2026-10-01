import { useEffect, useState } from 'react';

import { listen, send } from '@actual-app/core/platform/client/connection';

type UndoAvailability = {
  canUndo: boolean;
  canRedo: boolean;
};

export function useUndoAvailability(): UndoAvailability {
  const [availability, setAvailability] = useState<UndoAvailability>({
    canUndo: false,
    canRedo: false,
  });

  useEffect(() => {
    let isUnmounted = false;

    const unlisten = listen('undo-availability-changed', next => {
      setAvailability(next);
    });

    void send('undo-availability').then(current => {
      if (!isUnmounted && current) {
        setAvailability(current);
      }
    });

    return () => {
      isUnmounted = true;
      unlisten();
    };
  }, []);

  return availability;
}
