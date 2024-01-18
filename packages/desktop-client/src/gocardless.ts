// @ts-strict-ignore
import type { pushModal as pushModalAction } from 'loot-core/src/client/actions/modals';
import { send } from 'loot-core/src/platform/client/fetch';
import { type GoCardlessToken } from 'loot-core/src/types/models';

function _authorize(
  pushModal: typeof pushModalAction,
  upgradingAccountId: string | undefined,
  {
    onSuccess,
    onClose,
  }: {
    onSuccess: (data: GoCardlessToken) => Promise<void>;
    onClose?: () => void;
  },
) {
  pushModal('gocardless-external-msg', {
    onMoveExternal: async ({ institutionId }) => {
      const resp = await send('gocardless-create-web-token', {
        upgradingAccountId,
        institutionId,
        accessValidForDays: 30,
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
  });
}

export async function authorizeBank(
  pushModal: typeof pushModalAction,
  { upgradingAccountId }: { upgradingAccountId?: string } = {},
) {
  _authorize(pushModal, upgradingAccountId, {
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
