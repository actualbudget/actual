import { send } from 'loot-core/src/platform/client/fetch';

function _authorize(pushModal, upgradingAccountId, { onSuccess, onClose }) {
  pushModal('nordigen-external-msg', {
    onMoveExternal: async ({ institutionId }) => {
      const accessValidForDays = 30;
      const resp = await send('nordigen-create-web-token', {
        upgradingAccountId,
        institutionId,
        accessValidForDays,
      });

      if (resp.error) return resp;
      const { link, requisitionId } = resp;
      window.Actual.openURLInBrowser(link);

      let { error, data } = await send('nordigen-poll-web-token', {
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
