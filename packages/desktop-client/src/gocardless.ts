import { pushModal } from 'loot-core/client/modals/modalsSlice';
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
    pushModal({
      name: 'gocardless-external-msg',
      options: {
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
      },
    }),
  );
}

export async function authorizeBank(dispatch: AppDispatch) {
  _authorize(dispatch, {
    onSuccess: async data => {
      dispatch(
        pushModal({
          name: 'select-linked-accounts',
          options: {
            accounts: data.accounts,
            requisitionId: data.id,
            syncSource: 'goCardless',
          },
        }),
      );
    },
  });
}
