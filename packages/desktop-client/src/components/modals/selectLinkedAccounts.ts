import type { AccountEntity } from '@actual-app/core/types/models';

import type { AutocompleteItem } from '#components/autocomplete/Autocomplete';

type AddBudgetAccountOption = {
  id: string;
  name: string;
};

export function getSelectableAccountOptions({
  localAccounts,
  selectedLocalAccountIds,
  chosenAccount,
  syncSource,
  addOnBudgetAccountOption,
  addOffBudgetAccountOption,
}: {
  localAccounts: AccountEntity[];
  selectedLocalAccountIds: ReadonlySet<string>;
  chosenAccount: { id: string; name: string } | undefined;
  syncSource: NonNullable<AccountEntity['account_sync_source']>;
  addOnBudgetAccountOption: AddBudgetAccountOption;
  addOffBudgetAccountOption: AddBudgetAccountOption;
}): AutocompleteItem[] {
  const options: AutocompleteItem[] = localAccounts.filter(account => {
    const isCurrentSelection = account.id === chosenAccount?.id;

    // Keep the current row's selection visible. Otherwise, offer only accounts
    // that are unselected and either manual or linked to this provider.
    return (
      isCurrentSelection ||
      (!selectedLocalAccountIds.has(account.id) &&
        (account.account_sync_source == null ||
          account.account_sync_source === syncSource))
    );
  });

  options.push(addOnBudgetAccountOption, addOffBudgetAccountOption);
  return options;
}
