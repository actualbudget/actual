import React, { useMemo } from 'react';

import { useCachedAccounts } from 'loot-core/src/client/data-hooks/accounts';

import Autocomplete from './NewAutocomplete';

export default function AccountAutocomplete({
  value,
  includeClosedAccounts = true,
  multi = false,
  ...props
}) {
  const accounts = useCachedAccounts() || [];

  const availableAccounts = useMemo(
    () =>
      includeClosedAccounts ? accounts : accounts.filter(item => !item.closed),
    [accounts, includeClosedAccounts],
  );

  const options = useMemo(
    () => [
      {
        label: 'For Budget',
        options: availableAccounts
          .filter(item => !item.offbudget)
          .map(item => ({
            label: item.name,
            value: item.id,
          })),
      },
      {
        label: 'Off Budget',
        options: availableAccounts
          .filter(item => item.offbudget)
          .map(item => ({
            label: item.name,
            value: item.id,
          })),
      },
    ],
    [availableAccounts],
  );

  const allOptions = useMemo(
    () => options.reduce((carry, { options }) => [...carry, ...options], []),
    [options],
  );

  return (
    <Autocomplete
      options={options}
      value={
        multi
          ? allOptions.filter(item => value.includes(item.value))
          : allOptions.find(item => item.value === value)
      }
      isMulti={multi}
      {...props}
    />
  );
}
