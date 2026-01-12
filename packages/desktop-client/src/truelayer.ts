import { send } from 'loot-core/platform/client/fetch';
import { type TrueLayerAuthSession } from 'loot-core/types/models';

import { pushModal } from './modals/modalsSlice';
import { type AppDispatch } from './redux/store';

function _authorize(
  dispatch: AppDispatch,
  {
    onSuccess,
    onClose,
  }: {
    onSuccess: (data: TrueLayerAuthSession) => Promise<void>;
    onClose?: () => void;
  },
) {
  dispatch(
    pushModal({
      modal: {
        name: 'truelayer-external-msg',
        options: {
          onMoveExternal: async () => {
            const resp = await send('truelayer-create-web-token');

            if ('error' in resp) return resp;
            const { link, authId } = resp;
            window.Actual.openURLInBrowser(link);

            return send('truelayer-poll-web-token', {
              authId,
            });
          },
          onClose,
          onSuccess,
        },
      },
    }),
  );
}

export async function authorizeBank(dispatch: AppDispatch) {
  _authorize(dispatch, {
    onSuccess: async data => {
      dispatch(
        pushModal({
          modal: {
            name: 'select-linked-accounts',
            options: {
              externalAccounts: data.accounts,
              authId: data.authId,
              syncSource: 'truelayer',
            },
          },
        }),
      );
    },
  });
}
