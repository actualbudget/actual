import { send } from 'loot-core/src/platform/client/fetch';
import { type GoCardlessToken } from 'loot-core/src/types/models';

import { type Dispatch } from './state';
import { pushModal } from './state/actions';

function _authorize(
  dispatch: Dispatch,
  upgradingAccountId: string | undefined,
  {
    onSuccess,
    onClose,
  }: {
    onSuccess: (data: GoCardlessToken) => Promise<void>;
    onClose?: () => void;
  },
) {
  dispatch(
    pushModal('gocardless-external-msg', {
      onMoveExternal: async ({ institutionId }) => {
        const resp = await send('gocardless-create-web-token', {
          upgradingAccountId,
          institutionId,
          accessValidForDays: 90,
        });

        if ('error' in resp) return resp;
        const { link, requisitionId } = resp;
        window.Actual?.openURLInBrowser(link);

        return send('gocardless-poll-web-token', {
          upgradingAccountId,
          requisitionId,
        });
      },

      onClose,
      onSuccess,
    }),
  );
}

export async function authorizeBank(
  dispatch: Dispatch,
  { upgradingAccountId }: { upgradingAccountId?: string } = {},
) {
  _authorize(dispatch, upgradingAccountId, {
    onSuccess: async data => {
      dispatch(
        pushModal('select-linked-accounts', {
          externalAccounts: data.accounts,
          requisitionId: data.id,
          // upgradingAccountId,
          syncSource: 'goCardless',
        }),
      );
    },
    onClose: () => {
      send('gocardless-poll-web-token-stop');
    },
  });
}
