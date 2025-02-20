import { pushModal } from 'loot-core/client/actions/modals';
import { type AppDispatch } from 'loot-core/client/store';
import { send } from 'loot-core/platform/client/fetch';
import { type GoCardlessToken } from 'loot-core/types/models';

function _authorize(
  dispatch: AppDispatch,
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
        window.Actual.openURLInBrowser(link);

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
  dispatch: AppDispatch,
  { upgradingAccountId }: { upgradingAccountId?: string } = {},
) {
  _authorize(dispatch, upgradingAccountId, {
    onSuccess: async data => {
      dispatch(
        pushModal('select-linked-accounts', {
          accounts: data.accounts,
          requisitionId: data.id,
          upgradingAccountId,
          syncSource: 'goCardless',
        }),
      );
    },
  });
}
