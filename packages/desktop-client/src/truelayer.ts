import { sendCatch } from '@actual-app/core/platform/client/connection';
import type {
  AccountEntity,
  SyncServerTrueLayerAccount,
} from '@actual-app/core/types/models';
import { t } from 'i18next';

import { pushModal } from '#modals/modalsSlice';
import type { AppDispatch } from '#redux/store';

async function linkInBrowser(onStateReady: (state: string) => void) {
  const redirectUrl = `${window.location.origin}/truelayer/auth_callback`;
  const resp = await sendCatch('truelayer-start-auth', { redirectUrl });

  if (resp.error) {
    return { error: 'unknown' as const, message: resp.error.message };
  }

  const authError = resp.data?.error ?? resp.data?.error_type;
  if (authError) {
    return { error: 'unknown' as const, message: String(authError) };
  }

  const authUrl = resp.data?.url;
  const state = resp.data?.state;

  if (!authUrl || !state) {
    return {
      error: 'unknown' as const,
      message: t('Missing auth URL or state'),
    };
  }

  onStateReady(state);
  window.open(authUrl, 'truelayer-auth', 'width=600,height=700,popup=yes');

  const pollResp = await sendCatch('truelayer-poll-auth', { state });

  if (pollResp.error) {
    if (pollResp.error.message === 'timeout') {
      return { error: 'timeout' as const };
    }
    return { error: 'unknown' as const, message: pollResp.error.message };
  }

  const pollError = pollResp.data?.error;
  if (pollError) {
    return { error: 'unknown' as const, message: String(pollError) };
  }

  const accounts: SyncServerTrueLayerAccount[] = pollResp.data?.accounts ?? [];
  return { data: { accounts } };
}

export async function authorizeBank(
  dispatch: AppDispatch,
  upgradingAccountId?: AccountEntity['id'],
) {
  dispatch(
    pushModal({
      modal: {
        name: 'truelayer-external-msg',
        options: {
          onMoveExternal: linkInBrowser,
          onSuccess: async data => {
            dispatch(
              pushModal({
                modal: {
                  name: 'select-linked-accounts',
                  options: {
                    externalAccounts: data.accounts,
                    syncSource: 'trueLayer',
                    upgradingAccountId,
                  },
                },
              }),
            );
          },
        },
      },
    }),
  );
}
