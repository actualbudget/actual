import React, { useState } from 'react';
import { connect } from 'react-redux';

import * as actions from 'loot-core/src/client/actions';
import { View, Button, Tooltip } from 'loot-design/src/components/common';
import { colors } from 'loot-design/src/style';
import ExclamationOutline from 'loot-design/src/svg/v1/ExclamationOutline';

import { reauthorizeBank } from '../../plaid';

function getErrorMessage(type, code) {
  switch (type.toUpperCase()) {
    case 'ITEM_ERROR':
      switch (code.toUpperCase()) {
        case 'NO_ACCOUNTS':
          return 'No open accounts could be found. Did you close the account? If so, unlink the account.';
        case 'ITEM_LOGIN_REQUIRED':
          return 'Your password or something else has changed with your bank and you need to login again.';
        default:
      }
      break;

    case 'INVALID_INPUT':
      switch (code.toUpperCase()) {
        case 'INVALID_ACCESS_TOKEN':
          return 'Item is no longer authorized. You need to login again.';
        default:
      }
      break;

    case 'API_ERROR':
      switch (code.toUpperCase()) {
        case 'PLANNED_MAINTENANCE':
          return 'Our servers are currently undergoing maintenance and will be available again soon.';
        default:
      }
      break;

    case 'RATE_LIMIT_EXCEEDED':
      return 'Rate limit exceeded for this item. Please try again later.';

    default:
  }

  return 'An internal error occurred. Try to login again, or contact help@actualbudget.com for support.';
}

function AccountSyncCheck({
  id,
  accounts,
  failedAccounts,
  syncAndDownload,
  markAccountSuccess,
  unlinkAccount,
  pushModal,
  closeModal,
  getAccounts,
  addNotification
}) {
  if (!failedAccounts) {
    return null;
  }

  let error = failedAccounts.get(id);
  if (!error) {
    return null;
  }

  let [open, setOpen] = useState(false);

  let account = accounts.find(account => account.id === id);
  let { type, code } = error;
  let showAuth =
    (type === 'ITEM_ERROR' && code === 'ITEM_LOGIN_REQUIRED') ||
    (type === 'INVALID_INPUT' && code === 'INVALID_ACCESS_TOKEN');

  function reauth() {
    setOpen(false);

    let modalOpened = reauthorizeBank(pushModal, account.bankId, () => {
      closeModal();

      // Re-sync accounts. If there are multiple failed account, that
      // means all accounts were synced to resync all of them.
      // Multiple accounts can be tied to the same bank id.
      syncAndDownload(failedAccounts.size > 1 ? null : account.id);
    });

    if (!modalOpened) {
      addNotification({
        type: 'error',
        message: 'Unable to process this item, sorry!'
      });
    }
  }

  async function unlink() {
    unlinkAccount(account.id);
    setOpen(false);
  }

  return (
    <View>
      <Button
        bare
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          color: colors.r5,
          backgroundColor: colors.r10,
          padding: '4px 8px',
          borderRadius: 4
        }}
        onClick={() => setOpen(true)}
      >
        <ExclamationOutline
          style={{
            width: 14,
            height: 14,
            marginRight: 5,
            color: 'currentColor'
          }}
        />{' '}
        This account is experiencing connection problems. Let{"'"}s fix it.
      </Button>

      {open && (
        <Tooltip
          position="bottom-left"
          onClose={() => setOpen(false)}
          style={{ fontSize: 14, padding: 15, maxWidth: 400 }}
        >
          <div style={{ marginBottom: '1.15em' }}>
            The server returned the following error:
          </div>

          <div style={{ marginBottom: '1.25em', color: colors.r5 }}>
            {getErrorMessage(error.type, error.code)}
          </div>

          <View style={{ justifyContent: 'flex-end', flexDirection: 'row' }}>
            {showAuth ? (
              <>
                <Button onClick={unlink}>Unlink</Button>
                <Button primary onClick={reauth} style={{ marginLeft: 5 }}>
                  Reauthorize
                </Button>
              </>
            ) : (
              <Button onClick={unlink}>Unlink account</Button>
            )}
          </View>
        </Tooltip>
      )}
    </View>
  );
}

export default connect(
  state => ({
    accounts: state.queries.accounts,
    failedAccounts: state.account.failedAccounts
  }),
  actions
)(AccountSyncCheck);
