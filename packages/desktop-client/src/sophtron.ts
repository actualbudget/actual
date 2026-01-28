import { send } from 'loot-core/platform/client/fetch';
import { type SophtronToken } from 'loot-core/types/models/sophtron';

import { pushModal } from './modals/modalsSlice';
import { type AppDispatch } from './redux/store';

function _authorize(
  dispatch: AppDispatch,
  {
    onSuccess,
    onClose,
  }: {
    onSuccess: (data: SophtronToken) => Promise<void>;
    onClose?: () => void;
  },
) {
  dispatch(
    pushModal({
      modal: {
        name: 'sophtron-external-msg',
        options: {
          onMoveExternal: async ({ institutionId }) => {
            const resp = await send('sophtron-create-web-token', {
              institutionId,
            });

            if ('error' in resp) return resp;
            const { link, userInstitutionId } = resp;
            window.Actual.openURLInBrowser(link);

            return send('sophtron-poll-web-token', {
              userInstitutionId,
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
              userInstitutionId: data.id,
              syncSource: 'sophtron',
            },
          },
        }),
      );
    },
  });
}
