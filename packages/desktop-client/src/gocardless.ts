import { type Dispatch } from 'loot-core/client/actions/types';
import { pushModal } from 'loot-core/src/client/actions/modals';
import { send } from 'loot-core/src/platform/client/fetch';
import { type GoCardlessToken } from 'loot-core/src/types/models';

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
      pushModal('select-linked-accounts', {
        accounts: data.accounts,
        requisitionId: data.id,
        upgradingAccountId,
        syncSource: 'goCardless',
      });
    },
  });
}
