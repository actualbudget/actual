import { type AppDispatch } from 'loot-core/client/store';
import { pushModal } from 'loot-core/src/client/actions/modals';
import { send } from 'loot-core/src/platform/client/fetch';
import { type GoCardlessToken } from 'loot-core/src/types/models';

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
