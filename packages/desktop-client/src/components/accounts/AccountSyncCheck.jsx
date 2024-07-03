import React, { useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';

import { authorizeBank } from '../../gocardless';
import { useAccounts } from '../../hooks/useAccounts';
import { useActions } from '../../hooks/useActions';
import { SvgExclamationOutline } from '../../icons/v1';
import { theme } from '../../style';
import { Button } from '../common/Button';
import { Link } from '../common/Link';
import { Popover } from '../common/Popover';
import { View } from '../common/View';

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

    case 'RATE_LIMIT_EXCEEDED':
      return 'Rate limit exceeded for this item. Please try again later.';

    case 'INVALID_ACCESS_TOKEN':
      return 'Your SimpleFIN Access Token is no longer valid. Please reset and generate a new token.';

    case 'ACCOUNT_NEEDS_ATTENTION':
      return 'The account needs your attention at [SimpleFIN](https://beta-bridge.simplefin.org/auth/login).';

    default:
  }

  return (
    <>
      An internal error occurred. Try to login again, or get{' '}
      <Link variant="external" to="https://actualbudget.org/contact/">
        in touch
      </Link>{' '}
      for support.
    </>
  );
}

export function AccountSyncCheck() {
  const accounts = useAccounts();
  const failedAccounts = useSelector(state => state.account.failedAccounts);
  const { unlinkAccount, pushModal } = useActions();

  const { id } = useParams();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);

  if (!failedAccounts) {
    return null;
  }

  const error = failedAccounts.get(id);
  if (!error) {
    return null;
  }

  const account = accounts.find(account => account.id === id);
  const { type, code } = error;
  const showAuth =
    (type === 'ITEM_ERROR' && code === 'ITEM_LOGIN_REQUIRED') ||
    (type === 'INVALID_INPUT' && code === 'INVALID_ACCESS_TOKEN');

  function reauth() {
    setOpen(false);

    authorizeBank(pushModal, { upgradingAccountId: account.account_id });
  }

  async function unlink() {
    unlinkAccount(account.id);
    setOpen(false);
  }

  return (
    <View>
      <Button
        ref={triggerRef}
        type="bare"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          color: theme.errorText,
          backgroundColor: theme.errorBackground,
          padding: '4px 8px',
          borderRadius: 4,
        }}
        onClick={() => setOpen(true)}
      >
        <SvgExclamationOutline
          style={{ width: 14, height: 14, marginRight: 5 }}
        />{' '}
        This account is experiencing connection problems. Let’s fix it.
      </Button>

      <Popover
        triggerRef={triggerRef}
        placement="bottom start"
        isOpen={open}
        onOpenChange={() => setOpen(false)}
        style={{ fontSize: 14, padding: 15, maxWidth: 400 }}
      >
        <div style={{ marginBottom: '1.15em' }}>
          The server returned the following error:
        </div>

        <div style={{ marginBottom: '1.25em', color: theme.errorText }}>
          {getErrorMessage(error.type, error.code)}
        </div>

        <View style={{ justifyContent: 'flex-end', flexDirection: 'row' }}>
          {showAuth ? (
            <>
              <Button onClick={unlink}>Unlink</Button>
              <Button
                type="primary"
                autoFocus
                onClick={reauth}
                style={{ marginLeft: 5 }}
              >
                Reauthorize
              </Button>
            </>
          ) : (
            <Button onClick={unlink}>Unlink account</Button>
          )}
        </View>
      </Popover>
    </View>
  );
}
