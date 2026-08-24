import React, { useCallback, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useParams } from 'react-router';

import { Button } from '@actual-app/components/button';
import { SvgExclamationOutline } from '@actual-app/components/icons/v1';
import { Popover } from '@actual-app/components/popover';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';
import type { AccountEntity } from '@actual-app/core/types/models';

import {
  useSyncAndDownloadMutation,
  useUnlinkAccountMutation,
} from '#accounts';
import {
  getFailedSyncError,
  isAccountFailedSync,
  isGoCardlessConfigError,
} from '#accounts/syncStatus';
import { Link } from '#components/common/Link';
import { authorizeBank as authorizeEnableBanking } from '#enablebanking';
import { authorizeBank as authorizeGoCardless } from '#gocardless';
import { useAccounts } from '#hooks/useAccounts';
import { useCurrentAccess } from '#hooks/useCurrentAccess';
import { useFailedAccounts } from '#hooks/useFailedAccounts';
import { pushModal } from '#modals/modalsSlice';
import { useDispatch } from '#redux';

function useErrorMessage() {
  const { t } = useTranslation();
  const { isAdmin } = useCurrentAccess();
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

      case 'ACCOUNT_MISSING':
        return t(
          'This account was not found in SimpleFIN. Try unlinking and relinking the account.',
        );

      case 'CONFIG_ERROR':
        switch (code.toUpperCase()) {
          case 'GOCARDLESS_NOT_CONFIGURED':
            // Only an administrator can set the server-wide secrets, so
            // everybody else is pointed at one instead of at a form that
            // would be rejected.
            return isAdmin
              ? t(
                  'GoCardless is not set up on this server. Credentials are stored on the server, not in your budget file, so they are not restored from a backup. Enter your secret ID and key again to reconnect.',
                )
              : t(
                  'GoCardless is not set up on this server. Credentials are stored on the server, not in your budget file, so they are not restored from a backup. Ask an administrator to enter the secret ID and key again to reconnect.',
                );
          case 'GOCARDLESS_INVALID_CREDENTIALS':
            return isAdmin
              ? t(
                  'GoCardless rejected the secret ID and key set up on this server. Check them in your GoCardless account and enter them again.',
                )
              : t(
                  'GoCardless rejected the secret ID and key set up on this server. Ask an administrator to check them and enter them again.',
                );
          default:
        }
        break;

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
  const { data: accounts = [] } = useAccounts();
  const failedAccounts = useFailedAccounts();
  const dispatch = useDispatch();
  const { id } = useParams();
  const [open, setOpen] = useState(false);
  const triggerRef = useRef(null);
  const { getErrorMessage } = useErrorMessage();
  const { isAdmin } = useCurrentAccess();

  const reauth = useCallback(
    (acc: AccountEntity) => {
      setOpen(false);

      if (acc.account_id) {
        if (acc.account_sync_source === 'enableBanking') {
          void authorizeEnableBanking(dispatch);
        } else if (acc.account_sync_source === 'goCardless') {
          void authorizeGoCardless(dispatch);
        }
      }
    },
    [dispatch],
  );

  const syncAndDownload = useSyncAndDownloadMutation();
  const setUpGoCardless = useCallback(() => {
    setOpen(false);
    // The credentials are server-wide, so every GoCardless account that failed
    // for want of them is retried — not just the one shown here. It stops
    // there, though: accounts on other providers were never broken, and
    // healthy GoCardless accounts would be resynced for nothing, spending
    // their institution's request allowance and inviting unrelated failures.
    const brokenGoCardlessAccountIds = accounts
      .filter(
        account =>
          isAccountFailedSync(account) &&
          isGoCardlessConfigError(getFailedSyncError(account)),
      )
      .map(account => account.id);

    dispatch(
      pushModal({
        modal: {
          name: 'gocardless-init',
          options: {
            onSuccess: () =>
              syncAndDownload.mutate({ ids: brokenGoCardlessAccountIds }),
          },
        },
      }),
    );
  }, [accounts, dispatch, syncAndDownload]);

  const unlinkAccount = useUnlinkAccountMutation();
  const unlink = useCallback(
    (acc: AccountEntity) => {
      if (acc.id) {
        unlinkAccount.mutate({ id: acc.id });
      }

      setOpen(false);
    },
    [unlinkAccount],
  );

  if (!id) {
    return null;
  }

  const account = accounts.find(account => account.id === id);
  if (!account || !isAccountFailedSync(account)) {
    return null;
  }

  // prefer the detailed error from the client that ran the sync, fall back
  // to the persisted status for failures that happened on another client
  const error = failedAccounts.get(id) ?? getFailedSyncError(account);

  const { type, code } = error;
  const showAuth =
    (type === 'ITEM_ERROR' && code === 'ITEM_LOGIN_REQUIRED') ||
    (type === 'INVALID_INPUT' && code === 'INVALID_ACCESS_TOKEN');
  // The condition is tracked apart from the authorization to act on it: the
  // server's secrets are the problem either way, and unlinking is never the
  // answer to it — it throws away a working bank link and costs a fresh
  // consent at the bank to undo. A non-admin gets the explanation and no
  // buttons rather than the one destructive button.
  const goCardlessConfigError = isGoCardlessConfigError({ type, code });
  // both codes are repaired by re-entering the secrets, so a typo in the
  // replacement leads back to the form rather than to the generic dead end
  const showGoCardlessSetup = goCardlessConfigError && isAdmin;

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
          This account is experiencing connection problems. Let's fix it.
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
          {showAuth && (
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
          )}
          {showGoCardlessSetup && (
            <Button variant="primary" autoFocus onPress={setUpGoCardless}>
              <Trans>Set up GoCardless</Trans>
            </Button>
          )}
          {!showAuth && !showGoCardlessSetup && !goCardlessConfigError && (
            <Button onPress={() => unlink(account)}>
              <Trans>Unlink account</Trans>
            </Button>
          )}
        </View>
      </Popover>
    </View>
  );
}
