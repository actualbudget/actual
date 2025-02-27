import { pushModal } from 'loot-core/client/actions/modals';
import { type AppDispatch } from 'loot-core/client/store';
import { send } from 'loot-core/platform/client/fetch';
import { type GoCardlessToken } from 'loot-core/types/models';

function _authorize(
  dispatch: AppDispatch,
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
          institutionId,
          accessValidForDays: 90,
        });

        if ('error' in resp) return resp;
        const { link, requisitionId } = resp;
        window.Actual.openURLInBrowser(link);

        return send('gocardless-poll-web-token', {
          requisitionId,
        });
      },

      onClose,
      onSuccess,
    }),
  );
}

export async function authorizeBank(dispatch: AppDispatch) {
  _authorize(dispatch, {
    onSuccess: async data => {
      dispatch(
        pushModal('select-linked-accounts', {
          accounts: data.accounts,
          requisitionId: data.id,
          syncSource: 'goCardless',
        }),
      );
    },
  });
}
