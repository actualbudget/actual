import { send } from 'loot-core/platform/client/fetch';
import { type GoCardlessToken } from 'loot-core/types/models';

import { pushModal } from './modals/modalsSlice';
import { type AppDispatch } from './redux/store';

function _authorize(
  dispatch: AppDispatch,
  {
    onSuccess,
    onClose,
    fileId,
  }: {
    onSuccess: (data: GoCardlessToken) => Promise<void>;
    onClose?: () => void;
    fileId?: string;
  },
) {
  dispatch(
    pushModal({
      modal: {
        name: 'gocardless-external-msg',
        options: {
          fileId,
          onMoveExternal: async ({ institutionId }) => {
            const resp = await send('gocardless-create-web-token', {
              institutionId,
              accessValidForDays: 90,
              ...(fileId ? { fileId } : {}),
            });

            if ('error' in resp) return resp;
            const { link, requisitionId } = resp;
            window.Actual.openURLInBrowser(link);

            return send('gocardless-poll-web-token', {
              requisitionId,
              ...(fileId ? { fileId } : {}),
            });
          },
          onClose,
          onSuccess,
        },
      },
    }),
  );
}

export async function authorizeBank(dispatch: AppDispatch, fileId?: string) {
  _authorize(dispatch, {
    fileId,
    onSuccess: async data => {
      dispatch(
        pushModal({
          modal: {
            name: 'select-linked-accounts',
            options: {
              externalAccounts: data.accounts,
              requisitionId: data.id,
              syncSource: 'goCardless',
            },
          },
        }),
      );
    },
  });
}
