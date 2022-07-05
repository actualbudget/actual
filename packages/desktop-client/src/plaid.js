import { send } from 'loot-core/src/platform/client/fetch';
import { post } from 'loot-core/src/server/post';
import { usePlaidLink } from 'react-plaid-link';

function _authorize(pushModal, plaidToken, { onSuccess, onClose }) {
  pushModal('plaid-external-msg', {
    onMoveExternal: async () => {
      let serverURL = await send('get-server-url');
      let token = await send('create-web-token');
      let url = 'http://localhost:3001/plaid-link.html?token=' + token.webToken + '&serverurl=' + serverURL;
      if (plaidToken) {
        url = url + '&plaidToken=' + plaidToken;
      }
      window.Actual.openURLInBrowser(url);
      // const { open, ready } = usePlaidLink({
      //   token: token,
      //   onSuccess: (public_token, metadata) => {
      //     post(serverURL + '/plaid/put-web-token-contents', {
      //       token,
      //       data: { public_token, metadata }
      //     });
      //   },
      // });
      // open();

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
  let { error, linkToken } = await send('make-plaid-public-token', {
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
