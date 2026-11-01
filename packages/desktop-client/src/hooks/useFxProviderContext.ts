import { useEffect, useRef, useState } from 'react';

import { listen } from '@actual-app/core/platform/client/connection';

import { useMetadataPref } from './useMetadataPref';

type FxContextState = {
  budgetId: string;
  context: string | null;
  epoch: number;
};

/**
 * The server's FX context for the open budget. The `fx-provider-context`
 * event always wins; a current local reply may seed it only while it is
 * still unknown, so nothing here reads provider metadata from the network.
 * `epoch` changes only when the context is replaced, never when seeded.
 */
export function useFxProviderContext() {
  const [budgetId = ''] = useMetadataPref('id');
  const latest = useRef<FxContextState>({ budgetId, context: null, epoch: 0 });
  const [state, setState] = useState(latest.current);

  function publish(next: FxContextState) {
    latest.current = next;
    setState(next);
  }

  useEffect(() => {
    if (latest.current.budgetId !== budgetId) {
      publish({ budgetId, context: null, epoch: latest.current.epoch + 1 });
    }
    return listen('fx-provider-context', ({ context }) => {
      publish({ budgetId, context, epoch: latest.current.epoch + 1 });
    });
  }, [budgetId]);

  const current = state.budgetId === budgetId ? state : null;
  return {
    budgetId,
    context: current?.context ?? null,
    epoch: state.epoch,
    /** The latest context, or null once this render's budget is gone. */
    current() {
      return latest.current.budgetId === budgetId
        ? latest.current.context
        : null;
    },
    /** Seeds the context from a current local reply. */
    observe(context: string) {
      if (
        latest.current.budgetId === budgetId &&
        latest.current.context === null
      ) {
        publish({ ...latest.current, context });
      }
    },
  };
}

export type FxProviderContext = ReturnType<typeof useFxProviderContext>;
