// An integer amount in the minor units of its currency. Precision comes from
// the recorded encoding of the context that stores the integer, never from a
// field on the value. An empty currency code is the legacy no-currency budget.
export type Money = {
  amount: number;
  currencyCode: string;
};

const CURRENCY_CODE = /^(?:[A-Z]{3})?$/;

function isValidMoney(amount: unknown, currencyCode: unknown): boolean {
  return (
    Number.isSafeInteger(amount) &&
    typeof currencyCode === 'string' &&
    CURRENCY_CODE.test(currencyCode)
  );
}

export function isMoney(value: unknown): value is Money {
  return (
    typeof value === 'object' &&
    value !== null &&
    'amount' in value &&
    'currencyCode' in value &&
    isValidMoney(value.amount, value.currencyCode)
  );
}

export function toMoney(amount: number, currencyCode: string): Money {
  if (!isValidMoney(amount, currencyCode)) {
    throw new Error('money-invalid');
  }
  return { amount, currencyCode };
}

/** Accepts a raw integer or Money and returns the integer for the context currency. */
export function fromAmountInput(
  value: number | Money,
  expectedCurrencyCode: string,
): number {
  if (typeof value === 'number') {
    if (!Number.isSafeInteger(value)) {
      throw new Error('amount-invalid');
    }
    return value;
  }
  if (!isMoney(value)) {
    throw new Error('money-invalid');
  }
  if (value.currencyCode !== expectedCurrencyCode) {
    throw new Error('currency-mismatch');
  }
  return value.amount;
}
