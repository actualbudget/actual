import React, { useRef, useState } from 'react';
import { Trans } from 'react-i18next';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';

import { t } from 'i18next';

import { unlinkAccount } from 'loot-core/client/actions';

import { authorizeBank } from '../../gocardless';
import { useAccounts } from '../../hooks/useAccounts';
import { SvgExclamationOutline } from '../../icons/v1';
import { theme } from '../../style';
import { Button } from '../common/Button2';
import { Link } from '../common/Link';
import { Popover } from '../common/Popover';
import { View } from '../common/View';

function getErrorMessage(type, code) {
  switch (type.toUpperCase()) {
    case 'ITEM_ERROR':
      switch (code.toUpperCase()) {
        case 'NO_ACCOUNTS':
          return t(
            'No open accounts could be found. Did you close the account? If so, unlink the account.',
          );
        case 'ITEM_LOGIN_REQUIRED':
          return t(
            'Your password or something else has changed with your bank and you need to login again.',
          );
        default:
      }
      break;

    case 'INVALID_INPUT':
      switch (code.toUpperCase()) {
        case 'INVALID_ACCESS_TOKEN':
          return t('Item is no longer authorized. You need to login again.');
        default:
      }
      break;

    case 'RATE_LIMIT_EXCEEDED':
      return t('Rate limit exceeded for this item. Please try again later.');

    case 'INVALID_ACCESS_TOKEN':
      return t(
        'Your SimpleFIN Access Token is no longer valid. Please reset and generate a new token.',
      );

    case 'ACCOUNT_NEEDS_ATTENTION':
      return (
        <Trans>
          The account needs your attention at{' '}
          <Link variant="external" to="https://bridge.simplefin.org/auth/login">
            SimpleFIN
          </Link>
          .
        </Trans>
      );

    default:
  }

  return (
    <Trans>
      An internal error occurred. Try to login again, or get{' '}
      <Link variant="external" to="https://actualbudget.org/contact/">
        in touch
      </Link>{' '}
      for support.
    </Trans>
  );
}

export function AccountSyncCheck() {
  const accounts = useAccounts();
  const failedAccounts = useSelector(state => state.account.failedAccounts);
  const dispatch = useDispatch();
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

    authorizeBank(dispatch, { upgradingAccountId: account.account_id });
  }

  async function unlink() {
    dispatch(unlinkAccount(account.id));
    setOpen(false);
  }

  return (
    <View>
      <Button
        ref={triggerRef}
        variant="bare"
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          color: theme.errorText,
          backgroundColor: theme.errorBackground,
          padding: '4px 8px',
          borderRadius: 4,
        }}
        onPress={() => setOpen(true)}
      >
        <SvgExclamationOutline
          style={{ width: 14, height: 14, marginRight: 5 }}
        />{' '}
        <Trans>
          This account is experiencing connection problems. Let’s fix it.
        </Trans>
      </Button>

      <Popover
        triggerRef={triggerRef}
        placement="bottom start"
        isOpen={open}
        onOpenChange={() => setOpen(false)}
        style={{ fontSize: 14, padding: 15, maxWidth: 400 }}
      >
        <div style={{ marginBottom: '1.15em' }}>
          <Trans>The server returned the following error:</Trans>
        </div>

        <div style={{ marginBottom: '1.25em', color: theme.errorText }}>
          {getErrorMessage(error.type, error.code)}
        </div>

        <View style={{ justifyContent: 'flex-end', flexDirection: 'row' }}>
          {showAuth ? (
            <>
              <Button onPress={unlink}>
                <Trans>Unlink</Trans>
              </Button>
              <Button
                variant="primary"
                autoFocus
                onPress={reauth}
                style={{ marginLeft: 5 }}
              >
                <Trans>Reauthorize</Trans>
              </Button>
            </>
          ) : (
            <Button onPress={unlink}>
              <Trans>Unlink account</Trans>
            </Button>
          )}
        </View>
      </Popover>
    </View>
  );
}
