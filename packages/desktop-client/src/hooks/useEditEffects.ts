import { useEffect, useState } from 'react';

import { send } from '@actual-app/core/platform/client/connection';

/** One side of a row a dialog save changes, as a budget posting. */
export type EditEffectSide = {
  account: string;
  category: string | null;
  date: string;
  /** Base amount. */
  amount: number;
  isParent?: boolean;
  transferAccount?: string | null;
};

export type EditEffectRow = {
  before: EditEffectSide | null;
  after: EditEffectSide | null;
};

type Months = Awaited<ReturnType<typeof fetchEffects>>;

function fetchEffects(rows: EditEffectRow[]) {
  return send('budget/edit-effects', { rows });
}

export type EditEffectsState =
  | { status: 'none' }
  | { status: 'loading' }
  | { status: 'ready'; months: Months }
  | { status: 'error' };

/**
 * The budget effects of the save a dialog shows, for its notice. Results
 * are bound to the draft they describe: a response for an older draft is
 * discarded, and the state is `loading` until the current draft's arrives.
 * `rows` null means the dialog has no valid draft to describe.
 */
export function useEditEffects(rows: EditEffectRow[] | null): EditEffectsState {
  const key = rows ? JSON.stringify(rows) : null;
  const [result, setResult] = useState<
    | { key: string; status: 'ready'; months: Months }
    | { key: string; status: 'error' }
    | null
  >(null);
  useEffect(() => {
    if (key === null) return;
    let cancelled = false;
    fetchEffects(JSON.parse(key) as EditEffectRow[]).then(
      months => {
        if (!cancelled) setResult({ key, status: 'ready', months });
      },
      () => {
        if (!cancelled) setResult({ key, status: 'error' });
      },
    );
    return () => {
      cancelled = true;
    };
  }, [key]);
  if (key === null) return { status: 'none' };
  if (result?.key !== key) return { status: 'loading' };
  return result.status === 'ready'
    ? { status: 'ready', months: result.months }
    : { status: 'error' };
}
