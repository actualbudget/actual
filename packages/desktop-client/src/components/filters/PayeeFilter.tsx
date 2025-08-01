import React, { type RefObject } from 'react';
import { useTranslation } from 'react-i18next';

import { PayeeAutocomplete } from '@desktop-client/components/autocomplete/PayeeAutocomplete';

/** The type of selected value(s) this component holds. */
type PayeeFilterValue = string | string[];

/** This component only supports single- or multi-select operations. */
type PayeeFilterOp = 'is' | 'isNot' | 'oneOf' | 'notOneOf';

type PayeeFilterProps = {
  /** The selected value(s) of the filter. This is a controlled component. */
  value: PayeeFilterValue

  /** To determine the use of a single- or multi-select input. */
  op: PayeeFilterOp

  /** Called whenever the selected value(s) of the filter change. */
  onChange: (value: PayeeFilterValue) => void
}

/**
 * Component to filter on payee.
 *
 * This component also shows "inactive" payees, specifically meant for transfer payees
 * whose account are closed. This lets the end-user filter transactions (among others)
 * based on transfer payees of closed accounts.
 */
const PayeeFilter = ({
  value, op, onChange,
}: PayeeFilterProps) => {
  const { t } = useTranslation();
  const multi = ['oneOf', 'notOneOf'].includes(op);

  if (multi && !Array.isArray(value)) {
    value = [];
  }

  const placeholder = (multi && value.length > 0) ? null : t('nothing');

  return <PayeeAutocomplete
    type={multi ? 'multi' : 'single'}
    showInactivePayees={true}
    showMakeTransfer={false}
    openOnFocus={true}
    value={value}
    onSelect={onChange}
    inputProps={{ placeholder }}
  />
}

export default PayeeFilter
