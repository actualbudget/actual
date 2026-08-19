import { useLayoutEffect, useState } from 'react';

import { accountBalance } from '#spreadsheet/bindings';

import { useSpreadsheet } from './useSpreadsheet';

/**
 * Live balances for a set of accounts, keyed by account id. Values are
 * null until the spreadsheet reports them. Unlike useSheetValue this
 * accepts a variable-length list, binding one account-balance query per id.
 */
export function useAccountBalances(
  accountIds: string[],
): Record<string, number | null> {
  const spreadsheet = useSpreadsheet();
  const [balances, setBalances] = useState<Record<string, number | null>>({});

  // Re-bind only when the set of accounts actually changes
  const bindingKey = [...new Set(accountIds)].sort().join(',');

  useLayoutEffect(() => {
    if (bindingKey === '') {
      setBalances({});
      return;
    }

    let isMounted = true;
    const unbinds = bindingKey.split(',').map(accountId =>
      spreadsheet.bind('__global', accountBalance(accountId), result => {
        if (!isMounted) {
          return;
        }
        const value = typeof result.value === 'number' ? result.value : null;
        setBalances(previous =>
          previous[accountId] === value
            ? previous
            : { ...previous, [accountId]: value },
        );
      }),
    );

    return () => {
      isMounted = false;
      for (const unbind of unbinds) {
        unbind();
      }
    };
  }, [spreadsheet, bindingKey]);

  return balances;
}
