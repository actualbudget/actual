import { send } from 'loot-core/src/platform/client/fetch';

function _authorize(pushModal, plaidToken, { onSuccess, onClose }) {
  pushModal('plaid-external-msg', {
    onMoveExternal: async () => {
      const res = await send('plaid-create-web-token', {
        plaidToken,
      });

      if (res.error) return res;
      // const { link, token } = res;
      const { link } = res;

      window.Actual.openURLInBrowser(link);

      let { error, data } = await send('plaid-poll-web-token', {});

      return { error, data };
    },

    onClose,
    onSuccess,
  });
}

export async function authorizeBank(pushModal, { upgradingId } = {}) {
  _authorize(pushModal, null, {
    onSuccess: async data => {
      pushModal('plaid-select-linked-accounts', {
        institution: data.metadata.institution,
        publicToken: data.publicToken,
        accounts: data.metadata.accounts,
        upgradingId,
      });
    },
  });
}

export async function reauthorizeBank(pushModal, bankId, onSuccess) {
  let { linkToken } = await send('plaid-renew-public-token', {
    bankId,
  });

  // We don't do anything with the error right now
  if (!linkToken) {
    return false;
  }

  // When the modal is closed here, always try to re-sync the account
  // by calling `onSuccess`
  _authorize(pushModal, linkToken, { onSuccess, onClose: onSuccess });
  return true;
}
