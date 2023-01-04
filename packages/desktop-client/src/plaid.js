import { send } from 'loot-core/src/platform/client/fetch';

function _authorize(pushModal, plaidToken, { onSuccess, onClose }) {
  pushModal('plaid-external-msg', {
    onMoveExternal: async () => {
      let token = await send('create-web-token');
      let url = 'http://link.actualbudget.com/?token=' + token;
      // let url = 'http://localhost:8080/?token=' + token;
      if (plaidToken) {
        url = url + '&plaidToken=' + plaidToken;
      }
      window.Actual.openURLInBrowser(url);

      let { error, data } = await send('poll-web-token', { token });

      return { error, data };
    },

    onClose,
    onSuccess
  });
}

export async function authorizeBank(pushModal, { upgradingId } = {}) {
  _authorize(pushModal, null, {
    onSuccess: async data => {
      pushModal('select-linked-accounts', {
        institution: data.metadata.institution,
        publicToken: data.publicToken,
        accounts: data.metadata.accounts,
        upgradingId
      });
    }
  });
}

export async function reauthorizeBank(pushModal, bankId, onSuccess) {
  let { linkToken } = await send('make-plaid-public-token', {
    bankId
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
