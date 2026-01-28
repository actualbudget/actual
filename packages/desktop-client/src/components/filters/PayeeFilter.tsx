import React from 'react';
import { useTranslation } from 'react-i18next';

import type { PayeeEntity } from 'loot-core/types/models';

import { PayeeAutocomplete } from '@desktop-client/components/autocomplete/PayeeAutocomplete';

type PayeeFilterValue = PayeeEntity['id'] | PayeeEntity['id'][];

/** This component only supports single- or multi-select operations. */
type PayeeFilterOp = 'is' | 'isNot' | 'oneOf' | 'notOneOf';

type PayeeFilterProps = {
  /** The selected value(s) of the filter. This is a controlled component. */
  value: PayeeFilterValue;

  /** To determine the use of a single- or multi-select input. */
  op: PayeeFilterOp;

  /** Called whenever the selected value(s) of the filter change. */
  onChange: (value: PayeeFilterValue) => void;
};

/**
 * Component to filter on payee.
 *
 * This component also shows "inactive" payees, specifically meant for transfer payees
 * whose account are closed. This lets the end-user filter transactions (among others)
 * based on transfer payees of closed accounts.
 */
export const PayeeFilter = ({ value, op, onChange }: PayeeFilterProps) => {
  const { t } = useTranslation();
  const multi = ['oneOf', 'notOneOf'].includes(op);

  let coercedValue: PayeeFilterValue = value;
  if (multi) {
    coercedValue = Array.isArray(value) ? value : [];
  } else {
    coercedValue = Array.isArray(value) ? (value[0] ?? null) : value;
  }

  const placeholder =
    multi && coercedValue.length > 0 ? undefined : t('nothing');

  return (
    // @ts-expect-error: typing is not playing nicely with the union type of AutocompleteProps.
    <PayeeAutocomplete
      type={multi ? 'multi' : 'single'}
      showInactivePayees
      showMakeTransfer={false}
      openOnFocus
      value={coercedValue}
      inputProps={{ placeholder }}
      onSelect={(payeeIdOrIds: string | string[], _: string) =>
        onChange(payeeIdOrIds)
      }
    />
  );
};
