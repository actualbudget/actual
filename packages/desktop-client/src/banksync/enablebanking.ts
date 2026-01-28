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

  dispatch(closeModal());
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

export async function authorizeEnableBankingSession(
  dispatch: AppDispatch,
  account?: AccountEntity,
  onUnlink?: () => void,
) {
  // For reauth, fetch the bank record to get the ASPSP identifier
  // The bank_id field contains "COUNTRY_BANKNAME" (e.g., "IT_ING" or "NL_ABN_AMRO")
  let initialCountry: string | undefined;
  let initialAspsp: string | undefined;

  if (account?.bank && account.account_sync_source === 'enablebanking') {
    // Fetch the bank record from the database
    const bankRecord = await send('get-bank', { id: account.bank });
    if (bankRecord?.bank_id) {
      const underscoreIndex = bankRecord.bank_id.indexOf('_');
      if (underscoreIndex > 0) {
        initialCountry = bankRecord.bank_id.substring(0, underscoreIndex);
        initialAspsp = bankRecord.bank_id.substring(underscoreIndex + 1);
      }
    }
  }

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
          // Pre-select country and bank for re-authorization
          initialCountry,
          initialAspsp,
        },
      },
    }),
  );
}
