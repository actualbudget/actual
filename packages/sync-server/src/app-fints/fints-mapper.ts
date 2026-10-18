import { createHash } from 'node:crypto';

import type {
  AccountBalance,
  BankAccount,
  BankAnswer,
  Statement,
  Transaction,
} from 'lib-fints';

// The account id handed to the client is `<connectionId>|<account>[|<sub>]`,
// so a sync request carries everything needed to find the bank login again.
// Keep in sync with `getFinTSConnectionId` in loot-core `shared/fints.ts`.
const ACCOUNT_ID_SEPARATOR = '|';

export type FinTSAccountRef = {
  connectionId: string;
  accountNumber: string;
  subAccountId?: string;
};

export type FinTSSyncTransaction = {
  transactionId: string;
  booked: true;
  date: string;
  bookingDate: string;
  valueDate: string;
  payeeName: string;
  notes: string;
  transactionAmount: { amount: number; currency: string };
  remittanceInformationUnstructured?: string;
  creditorName?: string;
  debtorName?: string;
  bookingText?: string;
  purpose?: string;
  remoteName?: string;
  remoteAccountNumber?: string;
  remoteBankId?: string;
  endToEndId?: string;
  mandateId?: string;
  bankReference?: string;
  customerReference?: string;
  additionalInformation?: string;
};

export type FinTSSyncBalance = {
  balanceAmount: { amount: string; currency: string };
  balanceType: 'closingBooked' | 'interimAvailable';
  referenceDate: string;
};

export type FinTSSyncResult = {
  balances: FinTSSyncBalance[];
  startingBalance: number;
  transactions: {
    all: FinTSSyncTransaction[];
    booked: FinTSSyncTransaction[];
    pending: FinTSSyncTransaction[];
  };
};

export function buildAccountId(
  connectionId: string,
  account: Pick<BankAccount, 'accountNumber' | 'subAccountId'>,
): string {
  return [connectionId, account.accountNumber, account.subAccountId]
    .filter(part => part != null && part !== '')
    .join(ACCOUNT_ID_SEPARATOR);
}

export function parseAccountId(accountId: string): FinTSAccountRef | null {
  const [connectionId, accountNumber, subAccountId, ...rest] =
    accountId.split(ACCOUNT_ID_SEPARATOR);
  if (!connectionId || !accountNumber || rest.length > 0) {
    return null;
  }
  return { connectionId, accountNumber, subAccountId };
}

/** Formats a date in local time, as the statement parsers build them. */
export function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toCents(amount: number): number {
  return Math.round(amount * 100);
}

function clean(value: string | undefined): string | undefined {
  const trimmed = value?.replace(/\s+/g, ' ').trim();
  return trimmed ? trimmed : undefined;
}

/**
 * FinTS has no transaction id, so derive one from the booking's content. The
 * bank's own reference is part of the hash where it exists. Entries that are
 * identical in every field get a running suffix: they are interchangeable, so
 * their order cannot change which id each one receives in a meaningful way.
 */
function createIdGenerator(accountKey: string) {
  const seen = new Map<string, number>();

  return (transaction: Transaction): string => {
    const content = [
      accountKey,
      formatDate(transaction.entryDate),
      formatDate(transaction.valueDate),
      toCents(transaction.amount),
      clean(transaction.remoteAccountNumber) ?? '',
      clean(transaction.remoteName) ?? '',
      clean(transaction.purpose) ?? '',
      clean(transaction.e2eReference) ?? '',
      transaction.bankReference === 'NONREF'
        ? ''
        : (clean(transaction.bankReference) ?? ''),
    ].join('\u001f');

    const occurrence = seen.get(content) ?? 0;
    seen.set(content, occurrence + 1);

    return createHash('sha256')
      .update(`${content}\u001f${occurrence}`)
      .digest('hex')
      .slice(0, 32);
  };
}

export function mapTransaction(
  transaction: Transaction,
  transactionId: string,
  currency: string,
): FinTSSyncTransaction {
  const purpose = clean(transaction.purpose);
  const remoteName = clean(transaction.remoteName);
  const bookingText = clean(transaction.bookingText);
  const date = formatDate(transaction.entryDate);

  return {
    transactionId,
    booked: true,
    date,
    bookingDate: date,
    valueDate: formatDate(transaction.valueDate),
    payeeName: remoteName ?? bookingText ?? '',
    notes: purpose ?? '',
    transactionAmount: { amount: transaction.amount, currency },
    remittanceInformationUnstructured: purpose,
    ...(transaction.amount < 0
      ? { creditorName: remoteName }
      : { debtorName: remoteName }),
    bookingText,
    purpose,
    remoteName,
    remoteAccountNumber: clean(transaction.remoteAccountNumber),
    remoteBankId: clean(transaction.remoteBankId),
    endToEndId: clean(transaction.e2eReference),
    mandateId: clean(transaction.mandateReference),
    bankReference: clean(transaction.bankReference),
    customerReference: clean(transaction.customerReference),
    additionalInformation: clean(transaction.additionalInformation),
  };
}

/**
 * Turns the statements of one account into the response shape loot-core
 * expects from every bank sync provider. Transactions are sorted newest first.
 */
export function mapStatements(
  accountKey: string,
  statements: Statement[],
  startDate: string,
  fallbackCurrency: string,
  balance?: AccountBalance,
): FinTSSyncResult {
  const nextId = createIdGenerator(accountKey);
  const booked: FinTSSyncTransaction[] = [];

  for (const statement of statements) {
    const currency =
      statement.closingBalance?.currency ||
      statement.openingBalance?.currency ||
      fallbackCurrency;

    for (const transaction of statement.transactions) {
      // Ids must be generated for every entry so a shorter window cannot
      // shift the running suffix of identical entries.
      const id = nextId(transaction);
      if (formatDate(transaction.entryDate) >= startDate) {
        booked.push(mapTransaction(transaction, id, currency));
      }
    }
  }

  booked.sort((a, b) => b.date.localeCompare(a.date));

  const balances = getBalances(statements, fallbackCurrency, balance);
  const current = balances[0];

  return {
    balances,
    startingBalance: current
      ? toCents(Number(current.balanceAmount.amount))
      : 0,
    transactions: { all: booked, booked, pending: [] },
  };
}

function getBalances(
  statements: Statement[],
  fallbackCurrency: string,
  balance?: AccountBalance,
): FinTSSyncBalance[] {
  const balances: FinTSSyncBalance[] = [];

  if (balance) {
    balances.push({
      balanceAmount: {
        amount: balance.balance.toFixed(2),
        currency: balance.currency || fallbackCurrency,
      },
      balanceType: 'closingBooked',
      referenceDate: formatDate(balance.date),
    });
  } else {
    const latest = statements
      .map(statement => statement.closingBalance)
      .filter(closing => closing != null)
      .sort((a, b) => b.date.getTime() - a.date.getTime())[0];

    if (latest) {
      balances.push({
        balanceAmount: {
          amount: latest.value.toFixed(2),
          currency: latest.currency || fallbackCurrency,
        },
        balanceType: 'closingBooked',
        referenceDate: formatDate(latest.date),
      });
    }
  }

  const available = balance?.availableAmount;
  if (available != null && balances[0]) {
    balances.push({
      balanceAmount: {
        amount: available.toFixed(2),
        currency: balances[0].balanceAmount.currency,
      },
      balanceType: 'interimAvailable',
      referenceDate: balances[0].referenceDate,
    });
  }

  return balances;
}

// Return codes that mean the bank rejected the login itself. Retrying with
// the same PIN counts towards the bank's lockout, so these must stop all
// further requests for the connection until the user enters a new PIN.
// 9340: signature/PIN invalid, 9930: user unknown, 9931: PIN or login
// wrong / access blocked, 9942: PIN wrong, 9943: PIN must be changed.
const CREDENTIAL_ERROR_CODES = new Set([9340, 9930, 9931, 9942, 9943]);
// 9941: the entered TAN was wrong.
const TAN_ERROR_CODES = new Set([9941]);

export type BankAnswerClassification =
  | 'credentials-rejected'
  | 'tan-rejected'
  | 'other';

export function classifyBankAnswers(
  answers: BankAnswer[],
): BankAnswerClassification {
  if (answers.some(answer => CREDENTIAL_ERROR_CODES.has(answer.code))) {
    return 'credentials-rejected';
  }
  if (answers.some(answer => TAN_ERROR_CODES.has(answer.code))) {
    return 'tan-rejected';
  }
  return 'other';
}

/** The bank's error texts (codes 9xxx), for display to the user. */
export function describeBankErrors(answers: BankAnswer[]): string {
  const errors = answers.filter(answer => answer.code >= 9000);
  const relevant = errors.length > 0 ? errors : answers;
  return relevant.map(answer => `${answer.code}: ${answer.text}`).join('\n');
}
