import { pushModal } from '#modals/modalsSlice';
import type { AppDispatch } from '#redux/store';

// PIN, then possibly a TAN for the dialog and another one for the statements.
export const MAX_FINTS_AUTH_ATTEMPTS = 3;

/**
 * Asks the user for whatever the bank needs to continue (PIN, TAN method,
 * TAN or app approval). Resolves `true` once the login is ready and `false`
 * when the user cancels.
 */
export function authorizeFinTS(
  dispatch: AppDispatch,
  {
    connectionId,
    connectionName,
    refresh,
  }: {
    connectionId: string;
    connectionName?: string;
    refresh?: boolean;
  },
): Promise<boolean> {
  return new Promise(resolve => {
    dispatch(
      pushModal({
        modal: {
          name: 'fints-auth',
          options: {
            connectionId,
            connectionName,
            refresh,
            onComplete: resolve,
          },
        },
      }),
    );
  });
}
