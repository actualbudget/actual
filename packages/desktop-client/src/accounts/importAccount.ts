import { send } from '@actual-app/core/platform/client/connection';
import type { AccountEntity } from '@actual-app/core/types/models';
import { t } from 'i18next';

import { addNotification } from '#notifications/notificationsSlice';
import type { AppDispatch } from '#redux/store';

type ImportAccountDetection = {
  hintId: string | null;
  matchedAccountId: AccountEntity['id'] | null;
};

// Reads the account identifier from a file and looks up the account it was
// previously imported into. Never blocks an import: failures mean "no match".
export async function detectImportAccount(
  filepath: string,
): Promise<ImportAccountDetection> {
  try {
    return await send('transactions-detect-account', { filepath });
  } catch {
    return { hintId: null, matchedAccountId: null };
  }
}

// Remembers which account the file's identifier was imported into, and tells
// the user when that moved the identifier away from another account.
export async function pairImportedAccount({
  hintId,
  accountId,
  accounts,
  dispatch,
}: {
  hintId: string | null;
  accountId: AccountEntity['id'];
  accounts: AccountEntity[];
  dispatch: AppDispatch;
}) {
  if (!hintId) {
    return;
  }

  const { previousAccountId } = await send('transactions-pair-account', {
    hintId,
    accountId,
  });
  const previous = accounts.find(account => account.id === previousAccountId);
  const current = accounts.find(account => account.id === accountId);
  if (previous && current) {
    dispatch(
      addNotification({
        notification: {
          type: 'message',
          message: t(
            'The account in this file was previously linked to {{previous}}. It is now linked to {{current}}.',
            { previous: previous.name, current: current.name },
          ),
        },
      }),
    );
  }
}
