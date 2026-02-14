import * as d from 'date-fns';

import { getCurrency } from 'loot-core/shared/currencies';
import { amountToInteger } from 'loot-core/shared/util';

import { formatPayeeName } from '../../util/payee-name';
import { printIban, sortByBookingDateOrValueDate } from '../utils';

const SORTED_BALANCE_TYPE_LIST = [
  'closingBooked',
  'expected',
  'forwardAvailable',
  'interimAvailable',
  'interimBooked',
  'nonInvoiced',
  'openingBooked',
];

/** @type {import('./bank.interface').IBank} */
export default {
  institutionIds: ['IntegrationBank'],

  normalizeAccount(account) {
    return {
      account_id: account.id,
      institution: account.institution,
      mask: (account?.iban || '0000').slice(-4),
      iban: account?.iban || null,
      name: [
        account.name ?? account.displayName ?? account.product,
        printIban(account),
        account.currency,
      ]
        .filter(Boolean)
        .join(' '),
      official_name: account.product ?? `integration-${account.institution_id}`,
      type: 'checking',
    };
  },

  normalizeTransaction(transaction, _booked, editedTransaction = null) {
    const trans = editedTransaction ?? transaction;

    const date =
      trans.date ||
      transaction.bookingDate ||
      transaction.bookingDateTime ||
      transaction.valueDate ||
      transaction.valueDateTime;

    // If we couldn't find a valid date field we filter out this transaction
    // and hope that we will import it again once the bank has processed the
    // transaction further.
    if (!date) {
      return null;
    }

    const notes =
      trans.notes ??
      trans.remittanceInformationUnstructured ??
      trans.remittanceInformationUnstructuredArray?.join(' ');

    transaction.remittanceInformationUnstructuredArrayString =
      transaction.remittanceInformationUnstructuredArray?.join(',');
    transaction.remittanceInformationStructuredArrayString =
      transaction.remittanceInformationStructuredArray?.join(',');

    return {
      ...transaction,
      payeeName: trans.payeeName ?? formatPayeeName(trans),
      date: d.format(d.parseISO(date), 'yyyy-MM-dd'),
      notes,
    };
  },

  sortTransactions(transactions = []) {
    return sortByBookingDateOrValueDate(transactions);
  },

  calculateStartingBalance(sortedTransactions = [], balances = []) {
    const currentBalance = balances
      .filter(item => SORTED_BALANCE_TYPE_LIST.includes(item.balanceType))
      .sort(
        (a, b) =>
          SORTED_BALANCE_TYPE_LIST.indexOf(a.balanceType) -
          SORTED_BALANCE_TYPE_LIST.indexOf(b.balanceType),
      )[0];
    const currentBalanceDecimals = getCurrency(
      currentBalance?.balanceAmount?.currency || '',
    ).decimalPlaces;

    return sortedTransactions.reduce(
      (total, trans) => {
        return (
          total -
          amountToInteger(
            Number(trans.transactionAmount.amount || 0),
            currentBalanceDecimals,
          )
        );
      },
      amountToInteger(
        Number(currentBalance?.balanceAmount?.amount || 0),
        currentBalanceDecimals,
      ),
    );
  },
};
