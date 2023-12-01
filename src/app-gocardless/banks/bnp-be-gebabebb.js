import {
  sortByBookingDateOrValueDate,
  amountToInteger,
  printIban,
} from '../utils.js';

const SORTED_BALANCE_TYPE_LIST = [
  'closingBooked',
  'expected',
  'forwardAvailable',
  'interimAvailable',
  'interimBooked',
  'nonInvoiced',
  'openingBooked',
];

/** @type {import('./bank.interface.js').IBank} */
export default {
  institutionIds: [
    'FINTRO_BE_GEBABEBB',
    'HELLO_BE_GEBABEBB',
    'BNP_BE_GEBABEBB',
  ],

  normalizeAccount(account) {
    return {
      account_id: account.id,
      institution: account.institution,
      mask: (account?.iban || '0000').slice(-4),
      iban: account?.iban || null,
      name: [account.name, printIban(account), account.currency]
        .filter(Boolean)
        .join(' '),
      official_name: `integration-${account.institution_id}`,
      type: 'checking',
    };
  },

  /** BNP_BE_GEBABEBB provides a lot of useful information via the 'additionalField'
   *  There does not seem to be a specification of this field, but the following information is contained in its subfields:
   *  - for pending transactions: the 'atmPosName'
   *  - for booked transactions: the 'narrative'.
   *  This narrative subfield is most useful as it contains information required to identify the transaction,
   *  especially in case of debit card or instant payment transactions.
   *  Do note that the narrative subfield ALSO contains the remittance information if any.
   *  The goal of the  normalization is to place any relevant information of the additionalInformation
   *  field in the remittanceInformationUnstructuredArray field.
   */
  normalizeTransaction(transaction, _booked) {
    if (transaction.additionalInformation) {
      let additionalInformationObject = {};
      const additionalInfoRegex = /(, )?([^:]+): ((\[.*?\])|([^,]*))/g;
      let matches =
        transaction.additionalInformation.matchAll(additionalInfoRegex);
      if (matches) {
        for (let match of matches) {
          let key = match[2].trim();
          let value = (match[4] || match[5]).trim();
          // Remove square brackets and single quotes and commas
          value = value.replace(/[[\]',]/g, '');
          additionalInformationObject[key] = value;
        }
        // Keep existing unstructuredArray and add atmPosName and narrative
        transaction.remittanceInformationUnstructuredArray = [
          transaction.remittanceInformationUnstructuredArray ?? '',
          additionalInformationObject?.atmPosName ?? '',
          additionalInformationObject?.narrative ?? '',
        ].filter(Boolean);
      }
    }

    return {
      ...transaction,
      date: transaction.valueDate,
    };
  },

  sortTransactions(transactions = []) {
    return sortByBookingDateOrValueDate(transactions);
  },

  calculateStartingBalance(sortedTransactions = [], balances = []) {
    const currentBalance = balances
      .filter((item) => SORTED_BALANCE_TYPE_LIST.includes(item.balanceType))
      .sort(
        (a, b) =>
          SORTED_BALANCE_TYPE_LIST.indexOf(a.balanceType) -
          SORTED_BALANCE_TYPE_LIST.indexOf(b.balanceType),
      )[0];
    return sortedTransactions.reduce((total, trans) => {
      return total - amountToInteger(trans.transactionAmount.amount);
    }, amountToInteger(currentBalance?.balanceAmount?.amount || 0));
  },
};
