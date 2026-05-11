import { sendCatch } from '@actual-app/core/platform/client/connection';
import type {
  AccountEntity,
  SyncServerEnableBankingAccount,
} from '@actual-app/core/types/models';
import { t } from 'i18next';

import { pushModal } from '#modals/modalsSlice';
import type { AppDispatch } from '#redux/store';

function _authorize(
  dispatch: AppDispatch,
  {
    onSuccess,
    onClose,
  }: {
    onSuccess: (data: {
      accounts: SyncServerEnableBankingAccount[];
    }) => Promise<void>;
    onClose?: () => void;
  },
) {
  dispatch(
    pushModal({
      modal: {
        name: 'enablebanking-external-msg',
        options: {
          onMoveExternal: async ({
            aspspId,
            country,
            maxConsentValidity,
            onStateReady,
          }) => {
            const redirectUrl = `${window.location.origin}/enablebanking/auth_callback`;
            const resp = await sendCatch('enablebanking-start-auth', {
              aspspId,
              country,
              redirectUrl,
              maxConsentValidity,
            });

            if (resp.error) {
              return {
                error: 'unknown' as const,
                message: resp.error.message,
              };
            }

            const authData = resp.data;

            if (authData?.error) {
              return {
                error: 'unknown' as const,
                message: authData.error,
              };
            }

            const authUrl = authData?.data?.url ?? authData?.url;
            const state = authData?.data?.state ?? authData?.state;

            if (!authUrl || !state) {
              return {
                error: 'unknown' as const,
                message: t('Missing auth URL or state'),
              };
            }

            localStorage.setItem('enablebanking_auth_state', state);
            onStateReady?.(state);
            window.open(
              authUrl,
              'enablebanking-auth',
              'width=600,height=700,popup=yes',
            );

            try {
              const pollResp = await sendCatch('enablebanking-poll-auth', {
                state,
              });

              if (pollResp.error) {
                if (pollResp.error.message === 'timeout') {
                  return { error: 'timeout' as const };
                }

                return {
                  error: 'unknown' as const,
                  message: pollResp.error.message,
                };
              }

              const pollData = pollResp.data;

              // The poll response body itself may carry an error (e.g. when
              // the bank callback failed before the poll started).
              const pollError = pollData?.data?.error ?? pollData?.error;
              if (pollError) {
                return {
                  error: 'unknown' as const,
                  message:
                    typeof pollError === 'string'
                      ? pollError
                      : String(pollError),
                };
              }

              const accounts: SyncServerEnableBankingAccount[] =
                pollData?.data?.accounts ?? pollData?.accounts ?? [];

              return { data: { accounts } };
            } finally {
              // Only clear if this attempt's state is still the one stored;
              // a concurrent retry may have overwritten it with a newer one.
              if (localStorage.getItem('enablebanking_auth_state') === state) {
                localStorage.removeItem('enablebanking_auth_state');
              }
            }
          },
          onClose,
          onSuccess,
        },
      },
    }),
  );
}

export async function authorizeBank(
  dispatch: AppDispatch,
  upgradingAccountId?: AccountEntity['id'],
) {
  _authorize(dispatch, {
    onSuccess: async data => {
      dispatch(
        pushModal({
          modal: {
            name: 'select-linked-accounts',
            options: {
              externalAccounts: data.accounts,
              syncSource: 'enableBanking',
              upgradingAccountId,
            },
          },
        }),
      );
    },
  });
}
