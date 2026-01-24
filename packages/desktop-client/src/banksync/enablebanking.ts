import { t } from 'i18next';

import { send } from 'loot-core/platform/client/fetch';
import {
  type AccountEntity,
  type SyncServerGoCardlessAccount,
} from 'loot-core/types/models';
import { type EnableBankingToken } from 'loot-core/types/models/enablebanking';

import { linkAccount } from '@desktop-client/accounts/accountsSlice';
import { closeModal, pushModal } from '@desktop-client/modals/modalsSlice';
import { addNotification } from '@desktop-client/notifications/notificationsSlice';
import { type AppDispatch } from '@desktop-client/redux/store';

// export function handleEnableBankingError(error: EnableBankingErrorInterface){
//   const dispatch = useDispatch();
//   switch(error.error_code){

//   }
// }

export async function deconfigureEnableBanking() {
  await send('enablebanking-configure', { applicationId: null, secret: null });
}

export function selectEnableBankingAccounts(
  dispatch: AppDispatch,
  token: EnableBankingToken,
  accountEntity?: AccountEntity,
) {
  // converting accounts to "GoCardlessAccounts"
  // RANT: it seems BankSync could be much more standardized. Apart from init ofcourse.
  const accounts: SyncServerGoCardlessAccount[] = token.accounts.map(
    enableBankingAccount => {
      return {
        ...enableBankingAccount,
        institution: { name: enableBankingAccount.institution },
        mask: '',
        official_name: enableBankingAccount.name,
      };
    },
  );
  if (accountEntity && accountEntity.official_name) {
    //Find appropriate account
    const account = accounts
      .filter(
        tokenAccount =>
          tokenAccount.official_name === accountEntity.official_name,
      )
      .at(0);
    if (account) {
      dispatch(
        linkAccount({
          account,
          requisitionId: token.bank_id,
          upgradingId: accountEntity.id,
          syncSource: 'enablebanking',
        }),
      );
      dispatch(
        addNotification({
          notification: {
            type: 'message',
            message: t(
              'Reauthorized bank sync via Enable Banking for {{accountName}}',
              {
                accountName: accountEntity.name,
              },
            ),
          },
        }),
      );
      dispatch(closeModal());
      return;
    }
  }

  dispatch(
    pushModal({
      modal: {
        name: 'select-linked-accounts',
        options: {
          requisitionId: token.bank_id,
          externalAccounts: accounts,
          syncSource: 'enablebanking',
        },
      },
    }),
  );
}

export function authorizeEnableBankingSession(
  dispatch: AppDispatch,
  account?: AccountEntity,
  onUnlink?: () => void,
) {
  dispatch(
    pushModal({
      modal: {
        name: 'enablebanking-setup-account',
        options: {
          onSuccess: async (token: EnableBankingToken) => {
            if (onUnlink) {
              onUnlink();
            }
            selectEnableBankingAccounts(dispatch, token, account);
          },
        },
      },
    }),
  );
}
