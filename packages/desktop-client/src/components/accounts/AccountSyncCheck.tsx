import React, { useCallback, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useParams } from 'react-router';

import { Button } from '@actual-app/components/button';
import { SvgExclamationOutline } from '@actual-app/components/icons/v1';
import { Popover } from '@actual-app/components/popover';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { type AccountEntity } from 'loot-core/types/models';

import { unlinkAccount } from '@desktop-client/accounts/accountsSlice';
import { Link } from '@desktop-client/components/common/Link';
import { authorizeBank } from '@desktop-client/gocardless';
import { useAccounts } from '@desktop-client/hooks/useAccounts';
import { useFailedAccounts } from '@desktop-client/hooks/useFailedAccounts';
import { useDispatch } from '@desktop-client/redux';

function useErrorMessage() {
  const { t } = useTranslation();
  function getErrorMessage(type: string, code: string) {
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

      case 'TIMED_OUT':
        return t('The request timed out. Please try again later.');

      case 'INVALID_ACCESS_TOKEN':
        return t(
          'Your SimpleFIN Access Token is no longer valid. Please reset and generate a new token.',
        );

      case 'ACCOUNT_NEEDS_ATTENTION':
        return (
          <Trans>
            The account needs your attention at{' '}
            <Link
              variant="external"
              to="https://bridge.simplefin.org/auth/login"
            >
              SimpleFIN
            </Link>
            .
          </Trans>
        );

      default:
    }

    return (
      <Trans>
        An internal error occurred. Try to log in again, or get{' '}
        <Link variant="external" to="https://actualbudget.org/contact/">
          in touch
        </Link>{' '}
        for support.
      </Trans>
    );
  }

  return { getErrorMessage };
}

export function AccountSyncCheck() {
  const accounts = useAccounts();
  const failedAccounts = useFailedAccounts();
  const dispatch = useDispatch();
  const { id } = useParams();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const { getErrorMessage } = useErrorMessage();

  const reauth = useCallback(
    (acc: AccountEntity) => {
      setOpen(false);

      if (acc.account_id) {
        authorizeBank(dispatch);
      }
    },
    [dispatch],
  );

  const unlink = useCallback(
    (acc: AccountEntity) => {
      if (acc.id) {
        dispatch(unlinkAccount({ id: acc.id }));
      }

      setOpen(false);
    },
    [dispatch],
  );

  if (!failedAccounts || !id) {
    return null;
  }

  const error = failedAccounts.get(id);
  if (!error) {
    return null;
  }

  const account = accounts.find(account => account.id === id);
  if (!account) {
    return null;
  }

  const { type, code } = error;
  const showAuth =
    (type === 'ITEM_ERROR' && code === 'ITEM_LOGIN_REQUIRED') ||
    (type === 'INVALID_INPUT' && code === 'INVALID_ACCESS_TOKEN');

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
              <Button onPress={() => unlink(account)}>
                <Trans>Unlink</Trans>
              </Button>
              <Button
                variant="primary"
                autoFocus
                onPress={() => reauth(account)}
                style={{ marginLeft: 5 }}
              >
                <Trans>Reauthorize</Trans>
              </Button>
            </>
          ) : (
            <Button onPress={() => unlink(account)}>
              <Trans>Unlink account</Trans>
            </Button>
          )}
        </View>
      </Popover>
    </View>
  );
}
