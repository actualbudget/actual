import { send } from 'loot-core/src/platform/client/fetch';

function _authorize(pushModal, upgradingAccountId, { onSuccess, onClose }) {
  pushModal('nordigen-external-msg', {
    onMoveExternal: async ({ institutionId }) => {
      const accessValidForDays = 30;
      const resp = await send('create-web-token', {
        upgradingAccountId,
        institutionId,
        accessValidForDays,
      });

      const { link, requisitionId } = resp;
      window.Actual.openURLInBrowser(link);

      let { error, data } = await send('poll-web-token', {
        upgradingAccountId,
        requisitionId,
      });

      return { error, data };
    },

    onClose,
    onSuccess,
  });
}

export async function authorizeBank(pushModal, { upgradingAccountId } = {}) {
  _authorize(pushModal, upgradingAccountId, {
    onSuccess: async data => {
      pushModal('select-linked-accounts', {
        accounts: data.accounts,
        requisitionId: data.id,
        upgradingAccountId,
      });
    },
  });
}
