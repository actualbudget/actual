import type { Transaction } from '../app-gocardless/gocardless-node.types';

import { title } from './title/index';

function formatPayeeIban(iban: string) {
  return '(' + iban.slice(0, 4) + ' XXX ' + iban.slice(-4) + ')';
}

export const formatPayeeName = (trans: Transaction) => {
  const amount = Number(trans.transactionAmount.amount);
  const nameParts = [];

  // get the correct name and account fields for the transaction amount
  let name;
  let account;
  if (amount > 0 || Object.is(amount, 0)) {
    name = trans.debtorName;
    account = trans.debtorAccount;
  } else {
    name = trans.creditorName;
    account = trans.creditorAccount;
  }

  // use the correct name field if it was found
  // if not, use whatever we can find

  // if the primary name option is set, prevent the account from falling back
  account = name ? account : trans.debtorAccount || trans.creditorAccount;

  name =
    name ||
    trans.debtorName ||
    trans.creditorName ||
    trans.remittanceInformationUnstructured ||
    (trans.remittanceInformationUnstructuredArray || []).join(', ') ||
    trans.additionalInformation;

  if (name) {
    nameParts.push(title(name));
  }

  if (typeof account === 'object' && account && account.iban) {
    nameParts.push(formatPayeeIban(account.iban));
  }

  return nameParts.join(' ');
};
