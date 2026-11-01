import { useEnvelopeSheetValue } from '#components/budget/envelope/EnvelopeBudgetComponents';
import { envelopeBudget } from '#spreadsheet/bindings';

import { useAccounts } from './useAccounts';
import { useSyncedPref } from './useSyncedPref';

/** Spreadsheet explanation remains available after experimental flags are off. */
export function useFxSummary() {
  const amountCell = useEnvelopeSheetValue(envelopeBudget.fxChanges);
  const amount = amountCell ?? 0;
  const incompleteCell = useEnvelopeSheetValue(envelopeBudget.fxIncomplete);
  const incomplete = incompleteCell ?? false;
  const [currency = ''] = useSyncedPref('defaultCurrencyCode');
  const { data: accounts = [] } = useAccounts();
  const visible =
    amount !== 0 ||
    incomplete ||
    accounts.some(
      account =>
        !account.offbudget &&
        !!account.currency &&
        account.currency !== currency,
    );
  return {
    amount,
    incomplete,
    visible,
    ready: amountCell !== null && incompleteCell !== null,
  };
}
